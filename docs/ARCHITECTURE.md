# Архитектурные диаграммы системы "Строй-Контроль"

## Общая системная архитектура

```mermaid
graph TB
    subgraph "Client Layer"
        Web[🌐 Web Browser]
        Mobile[📱 Mobile App]
        Admin[⚙️ Admin Panel]
    end
    
    subgraph "Load Balancer & Proxy"
        LB[⚖️ Nginx Load Balancer]
        CDN[🌍 CDN]
    end
    
    subgraph "API Gateway & Security"
        Gateway[🚪 API Gateway]
        Auth[🔐 Auth Service]
        Rate[⏱️ Rate Limiter]
    end
    
    subgraph "Application Layer"
        Frontend[⚛️ React Frontend]
        Backend[🐹 Go Backend API]
        AI[🤖 AI Services]
        WS[📡 WebSocket Server]
    end
    
    subgraph "Data Layer"
        DB[(🗄️ PostgreSQL)]
        Cache[(⚡ Redis Cache)]
        Files[📁 File Storage<br/>MinIO/S3]
    end
    
    subgraph "External Services"
        Email[📧 Email Service]
        SMS[📲 SMS Service]
        Bank[🏦 Banking APIs]
        Cloud[☁️ Cloud Storage]
    end
    
    subgraph "Monitoring & Logs"
        Logs[📊 Centralized Logs]
        Metrics[📈 Metrics]
        Alerts[🚨 Alerts]
    end
    
    Web --> LB
    Mobile --> LB
    Admin --> LB
    
    LB --> Gateway
    Gateway --> Frontend
    Gateway --> Backend
    Gateway --> Auth
    Gateway --> Rate
    
    Backend --> DB
    Backend --> Cache
    Backend --> Files
    Backend --> AI
    Backend --> WS
    
    Backend --> Email
    Backend --> SMS
    Backend --> Bank
    
    Files --> Cloud
    
    Backend --> Logs
    Backend --> Metrics
    Metrics --> Alerts
```

## Архитектура бэкенда

```mermaid
graph TB
    subgraph "API Layer"
        Router[🛣️ Gin Router]
        Middleware[🔧 Middleware Stack]
        Handlers[🎯 HTTP Handlers]
    end
    
    subgraph "Business Logic"
        Services[⚙️ Business Services]
        AuthService[🔐 Auth Service]
        ProjectService[📋 Project Service]
        EstimateService[💰 Estimate Service]
        FinanceService[📊 Finance Service]
        CRMService[👥 CRM Service]
        AIService[🤖 AI Service]
    end
    
    subgraph "Data Access"
        Repository[💾 Repository Layer]
        Models[📄 Data Models]
        ORM[🔄 GORM ORM]
        CacheRepo[⚡ Cache Repository]
    end
    
    subgraph "External Integrations"
        AIProviders[🤖 AI Providers]
        EmailSvc[📧 Email Service]
        FileSvc[📁 File Service]
        NotificationSvc[📢 Notification Service]
    end
    
    Router --> Middleware
    Middleware --> Handlers
    Handlers --> Services
    
    Services --> Repository
    Services --> AuthService
    Services --> ProjectService
    Services --> EstimateService
    Services --> FinanceService
    Services --> CRMService
    Services --> AIService
    
    Repository --> Models
    Repository --> ORM
    Repository --> CacheRepo
    
    Services --> AIProviders
    Services --> EmailSvc
    Services --> FileSvc
    Services --> NotificationSvc
```

## Схема базы данных

```mermaid
erDiagram
    users {
        uuid id PK
        string email UK
        string name
        string password_hash
        user_role role
        string avatar_url
        string phone
        boolean is_active
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
    }
    
    projects {
        uuid id PK
        string name
        string address
        string contract_number
        date contract_date
        text description
        uuid customer_id FK
        uuid general_contractor_id FK
        uuid contact_person_id FK
        project_status status
        timestamptz created_at
        timestamptz updated_at
    }
    
    project_team {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        project_role role
        timestamptz created_at
    }
    
    estimates {
        uuid id PK
        uuid project_id FK
        string name
        estimate_status status
        uuid manager_id FK
        uuid estimator_id FK
        vat_mode vat_mode
        int version
        uuid original_estimate_id FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    estimate_items {
        uuid id PK
        uuid estimate_id FK
        uuid parent_id FK
        estimate_item_type item_type
        resource_type resource_type
        string name
        string unit
        float quantity
        float cost_price
        float markup
        uuid assigned_contractor_id FK
        int order
        date start_date
        date end_date
        float progress
        timestamptz created_at
        timestamptz updated_at
    }
    
    transactions {
        uuid id PK
        uuid project_id FK
        uuid account_id FK
        uuid article_id FK
        transaction_type type
        float amount
        text description
        date transaction_date
        uuid approved_by_id FK
        transaction_status status
        timestamptz created_at
        timestamptz updated_at
    }
    
    accounts {
        uuid id PK
        string name
        account_type type
        float balance
        string description
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    
    leads {
        uuid id PK
        uuid responsible_id FK
        string company_name
        string contact_name
        string email
        string phone
        lead_status status
        lead_source source
        text notes
        decimal potential_value
        timestamptz created_at
        timestamptz updated_at
    }
    
    counterparties {
        uuid id PK
        string name
        string inn
        string kpp
        string address
        string phone
        string email
        string contact_person
        counterparty_type type
        timestamptz created_at
        timestamptz updated_at
    }
    
    documents {
        uuid id PK
        uuid project_id FK
        string filename
        string original_filename
        string mime_type
        int file_size
        string file_hash
        document_type type
        uuid uploaded_by_id FK
        timestamptz created_at
    }
    
    notifications {
        uuid id PK
        uuid user_id FK
        string title
        text message
        notification_type type
        boolean is_read
        json metadata
        timestamptz created_at
    }
    
    users ||--o{ project_team : "team_member"
    projects ||--o{ project_team : "project"
    projects ||--o{ estimates : "project"
    estimates ||--o{ estimate_items : "estimate"
    projects ||--o{ transactions : "project"
    accounts ||--o{ transactions : "account"
    projects ||--o{ documents : "project"
    users ||--o{ notifications : "user"
    users ||--o{ leads : "responsible"
    counterparties ||--o{ projects : "customer"
```

## Поток аутентификации и авторизации

```mermaid
sequenceDiagram
    participant Client
    participant Frontend
    participant Backend
    participant DB
    participant Cache
    
    Client->>Frontend: Login Request
    Frontend->>Backend: POST /api/v1/auth/login
    Backend->>DB: Validate credentials
    DB-->>Backend: User data
    Backend->>Cache: Store refresh token
    Backend-->>Frontend: JWT + Refresh Token
    Frontend-->>Client: Login success
    
    Note over Client,Cache: Token Usage Flow
    
    Client->>Frontend: API Request + JWT
    Frontend->>Backend: Protected endpoint
    Backend->>Backend: Validate JWT
    alt Token valid
        Backend-->>Frontend: API Response
        Frontend-->>Client: Data
    else Token expired
        Backend-->>Frontend: 401 Unauthorized
        Frontend->>Backend: Refresh token request
        Backend->>Cache: Validate refresh token
        Cache-->>Backend: Token valid
        Backend-->>Frontend: New JWT pair
        Frontend-->>Client: Retry original request
    end
```

## Архитектура AI интеграции

```mermaid
graph TB
    subgraph "AI Request Flow"
        Frontend[⚛️ Frontend]
        Backend[🐹 Backend API]
        AIService[🤖 AI Service]
    end
    
    subgraph "AI Providers"
        Google[🌟 Google Gemini]
        OpenAI[🧠 OpenAI GPT]
        Anthropic[🧠 Anthropic Claude]
        Groq[⚡ Groq Llama]
    end
    
    subgraph "AI Processing"
        Queue[📋 Processing Queue]
        Cache[⚡ Response Cache]
        Rate[⏱️ Rate Limiter]
    end
    
    subgraph "Use Cases"
        Chat[💬 Chat Assistant]
        EstimateAnalysis[📊 Estimate Analysis]
        ScheduleOptimization[📅 Schedule Optimization]
        ImageGeneration[🎨 Image Generation]
        VoiceToText[🎤 Voice to Text]
    end
    
    Frontend --> Backend
    Backend --> AIService
    AIService --> Queue
    
    Queue --> Google
    Queue --> OpenAI
    Queue --> Anthropic
    Queue --> Groq
    
    Google --> Cache
    OpenAI --> Cache
    Anthropic --> Cache
    Groq --> Cache
    
    AIService --> Chat
    AIService --> EstimateAnalysis
    AIService --> ScheduleOptimization
    AIService --> ImageGeneration
    AIService --> VoiceToText
    
    AIService --> Rate
```

## Поток обработки смет

```mermaid
flowchart TD
    Start[📝 Start Estimate Creation] --> Input[📊 Input Data]
    
    Input --> Type{Estimate Type}
    
    Type -->|Manual| Manual[✏️ Manual Entry]
    Type -->|AI Generated| AI[🤖 AI Generation]
    Type -->|From File| File[📄 File Import]
    
    Manual --> Validation[✅ Data Validation]
    AI --> Prompt[🎯 AI Prompt]
    File --> Parse[📋 File Parsing]
    
    Prompt --> Validation
    Parse --> Validation
    
    Validation --> Items[📋 Items Creation]
    Items --> Calculations[💰 Cost Calculations]
    Calculations --> Review[👀 Review & Edit]
    
    Review --> Approve{Approved?}
    
    Approve -->|No| Review
    Approve -->|Yes| Save[💾 Save to Database]
    
    Save --> Version[🔢 Create Version]
    Version --> Notify[📢 Notify Stakeholders]
    Notify --> End[✅ Estimate Ready]
    
    subgraph "AI Analysis"
        A1[🤖 AI Analysis]
        A2[📊 Cost Optimization]
        A3[⚠️ Risk Assessment]
        A4[📈 Performance Prediction]
    end
    
    Save --> A1
    A1 --> A2
    A1 --> A3
    A1 --> A4
```

## Мониторинг и алертинг

```mermaid
graph TB
    subgraph "Application Metrics"
        API[📊 API Metrics]
        DB[🗄️ Database Metrics]
        Cache[⚡ Cache Metrics]
        Files[📁 File Storage Metrics]
    end
    
    subgraph "Monitoring Stack"
        Prometheus[📈 Prometheus]
        Grafana[📊 Grafana]
        AlertManager[🚨 AlertManager]
    end
    
    subgraph "Alert Channels"
        Email[📧 Email]
        Slack[💬 Slack]
        SMS[📲 SMS]
        Webhook[🔗 Webhook]
    end
    
    subgraph "Log Aggregation"
        AppLogs[📝 Application Logs]
        AccessLogs[🌐 Access Logs]
        ErrorLogs[❌ Error Logs]
        AuditLogs[🔍 Audit Logs]
    end
    
    API --> Prometheus
    DB --> Prometheus
    Cache --> Prometheus
    Files --> Prometheus
    
    Prometheus --> Grafana
    Prometheus --> AlertManager
    
    AlertManager --> Email
    AlertManager --> Slack
    AlertManager --> SMS
    AlertManager --> Webhook
    
    AppLogs --> ELK[📚 ELK Stack]
    AccessLogs --> ELK
    ErrorLogs --> ELK
    AuditLogs --> ELK
```

---

*Диаграммы созданы: 24.11.2024*
*Инструмент: Mermaid.js*
*Версия: 1.0*