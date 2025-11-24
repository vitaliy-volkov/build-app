# Архитектурная диаграмма системы технического надзора

## 🏗️ Общая архитектура системы

```mermaid
graph TB
    subgraph "Клиентские приложения"
        WebApp[🌐 Веб-приложение<br/>React + TypeScript]
        MobileApp[📱 Мобильное приложение<br/>React Native]
        AdminPanel[⚙️ Админ панель<br/>React Dashboard]
    end
    
    subgraph "API Gateway"
        Gateway[🚪 API Gateway<br/>Express/Fastify]
        Auth[🔐 Аутентификация<br/>JWT + OAuth2]
        RateLimit[📊 Rate Limiting<br/>Redis]
    end
    
    subgraph "Микросервисы"
        DrawingService[📄 Drawing Service<br/>Node.js + PDF.js]
        AnnotationService[🎨 Annotation Service<br/>Node.js + Canvas]
        DefectService[🐛 Defect Service<br/>Node.js]
        VersionService[🔄 Version Service<br/>Node.js]
        NotificationService[📬 Notification Service<br/>Node.js]
        SyncService[🔄 Sync Service<br/>Node.js + SQLite]
    end
    
    subgraph "AI Gateway"
        AIGateway[🤖 AI Gateway<br/>Python + FastAPI]
        DrawingAI[📐 Drawing Analysis<br/>Computer Vision]
        DefectAI[🔍 Defect Detection<br/>ML Models]
        AnnotationAI[✏️ Annotation Helper<br/>NLP + CV]
        ComparisonAI[🔀 Version Comparison<br/>Diff Algorithms]
    end
    
    subgraph "База данных"
        PostgreSQL[(🐘 PostgreSQL<br/>Основные данные)]
        Redis[(⚡ Redis<br/>Кэш + Сессии)]
        MinIO[(📦 MinIO/S3<br/>Файлы + PDF)]
        VectorDB[(🗄️ Vector DB<br/>AI Embeddings)]
    end
    
    subgraph "Внешние сервисы"
        EmailService[📧 Email Service<br/>Resend/SendGrid]
        PushService[📱 Push Notifications<br/>FCM/APNS]
        StorageService[☁️ Cloud Storage<br/>AWS S3/Google Cloud]
        AIServices[🧠 AI Models<br/>OpenAI/Gemini/Anthropic]
    end
    
    %% Connections
    WebApp --> Gateway
    MobileApp --> Gateway
    AdminPanel --> Gateway
    
    Gateway --> Auth
    Gateway --> RateLimit
    
    Gateway --> DrawingService
    Gateway --> AnnotationService
    Gateway --> DefectService
    Gateway --> VersionService
    Gateway --> NotificationService
    Gateway --> SyncService
    
    DrawingService --> AIGateway
    AnnotationService --> AIGateway
    DefectService --> AIGateway
    VersionService --> AIGateway
    
    AIGateway --> DrawingAI
    AIGateway --> DefectAI
    AIGateway --> AnnotationAI
    AIGateway --> ComparisonAI
    
    DrawingService --> PostgreSQL
    AnnotationService --> PostgreSQL
    DefectService --> PostgreSQL
    VersionService --> PostgreSQL
    NotificationService --> Redis
    SyncService --> Redis
    
    DrawingService --> MinIO
    AnnotationService --> MinIO
    VersionService --> MinIO
    
    AIGateway --> VectorDB
    AIGateway --> AIServices
    
    NotificationService --> EmailService
    NotificationService --> PushService
    
    DrawingService --> StorageService
    AnnotationService --> StorageService
```

## 📱 Детальная архитектура мобильного приложения

```mermaid
graph TB
    subgraph "React Native App"
        subgraph "UI Layer"
            Screens[📱 Экраны]
            Components[🧩 Компоненты]
            Navigation[🧭 Навигация]
        end
        
        subgraph "State Management"
            Zustand[🏪 Zustand Store]
            ReactQuery[🔍 React Query]
            AsyncStorage[💾 AsyncStorage]
        end
        
        subgraph "Services"
            APIService[🌐 API Service]
            PDFService[📄 PDF Service]
            CanvasService[🎨 Canvas Service]
            SyncService[🔄 Sync Service]
            CameraService[📷 Camera Service]
            AILocalService[🤖 Local AI Service]
        end
        
        subgraph "Local Storage"
            SQLite[(💾 SQLite DB)]
            FileSystem[📁 File System]
            Cache[⚡ Image Cache]
        end
    end
    
    %% Mobile connections
    Screens --> Components
    Screens --> Zustand
    Components --> ReactQuery
    
    Zustand --> APIService
    ReactQuery --> APIService
    AsyncStorage --> SQLite
    
    APIService --> PDFService
    APIService --> CanvasService
    APIService --> SyncService
    APIService --> CameraService
    
    PDFService --> FileSystem
    CanvasService --> Cache
    SyncService --> SQLite
    CameraService --> FileSystem
    
    AILocalService --> FileSystem
```

## 🌐 Детальная архитектура веб-приложения

```mermaid
graph TB
    subgraph "React Web App"
        subgraph "Presentation Layer"
            Pages[📄 Страницы]
            Layouts[🏗️ Layouts]
            Components[🧩 Компоненты]
        end
        
        subgraph "State Management"
            Zustand[🏪 Zustand Store]
            ReactQuery[🔍 React Query]
            LocalStorage[💾 LocalStorage]
        end
        
        subgraph "Services"
            APIClient[🌐 API Client]
            WebSocketClient[🔌 WebSocket Client]
            PDFRenderer[📄 PDF Renderer]
            CanvasRenderer[🎨 Canvas Renderer]
            WorkerServices[👷 Web Workers]
        end
        
        subgraph "Browser Storage"
            IndexedDB[(🗄️ IndexedDB)]
            CacheStorage[⚡ Cache API]
            SessionStorage[💾 SessionStorage]
        end
    end
    
    %% Web connections
    Pages --> Layouts
    Pages --> Components
    Components --> Zustand
    Components --> ReactQuery
    
    Zustand --> APIClient
    ReactQuery --> APIClient
    LocalStorage --> IndexedDB
    
    APIClient --> WebSocketClient
    APIClient --> PDFRenderer
    APIClient --> CanvasRenderer
    
    PDFRenderer --> WorkerServices
    CanvasRenderer --> WorkerServices
    
    WorkerServices --> CacheStorage
```

## 🔧 Backend микросервисная архитектура

```mermaid
graph TB
    subgraph "API Gateway Layer"
        Gateway[🚪 API Gateway<br/>Express + Middleware]
        Auth[🔐 Auth Service<br/>JWT + RBAC]
        Validation[✅ Validation<br/>Joi/Yup]
        RateLimit[📊 Rate Limiting<br/>Redis + Sliding Window]
    end
    
    subgraph "Business Services"
        DrawingService[📄 Drawing Service<br/>PDF Processing + Storage]
        AnnotationService[🎨 Annotation Service<br/>Canvas + Geometry]
        DefectService[🐛 Defect Service<br/>Workflow + Tracking]
        VersionService[🔄 Version Service<br/>Diff + History]
        NotificationService[📬 Notification Service<br/>Email + Push]
        SyncService[🔄 Sync Service<br/>Offline + Conflict Resolution]
        AnalyticsService[📊 Analytics Service<br/>Metrics + Reports]
    end
    
    subgraph "AI Gateway"
        AIGateway[🤖 AI Gateway<br/>FastAPI + Python]
        RequestRouter[🛣️ Request Router<br/>Load Balancer]
        QueueManager[📋 Queue Manager<br/>Celery + Redis]
        ModelManager[🧠 Model Manager<br/>ML Model Registry]
    end
    
    subgraph "AI Services"
        DrawingAnalyzer[📐 Drawing Analyzer<br/>Computer Vision]
        DefectDetector[🔍 Defect Detector<br/>Object Detection]
        AnnotationHelper[✏️ Annotation Helper<br/>NLP + CV]
        VersionComparator[🔀 Version Comparator<br/>Image Diff]
        QualityPredictor[📈 Quality Predictor<br/>Time Series]
    end
    
    subgraph "Data Layer"
        PostgreSQL[(🐘 PostgreSQL<br/>Primary DB)]
        Redis[(⚡ Redis<br/>Cache + Queue)]
        MinIO[(📦 MinIO/S3<br/>Object Storage)]
        VectorDB[(🗄️ Vector DB<br/>Embeddings)]
        TimescaleDB[(📊 TimescaleDB<br/>Time Series)]
    end
    
    subgraph "Infrastructure"
        Docker[🐳 Docker Containers]
        Kubernetes[☸️ Kubernetes Cluster]
        Nginx[🌐 Nginx Load Balancer]
        Monitoring[📈 Monitoring<br/>Prometheus + Grafana]
        Logging[📝 Logging<br/>ELK Stack]
    end
    
    %% Service connections
    Gateway --> Auth
    Gateway --> Validation
    Gateway --> RateLimit
    
    Gateway --> DrawingService
    Gateway --> AnnotationService
    Gateway --> DefectService
    Gateway --> VersionService
    Gateway --> NotificationService
    Gateway --> SyncService
    Gateway --> AnalyticsService
    
    DrawingService --> AIGateway
    AnnotationService --> AIGateway
    DefectService --> AIGateway
    VersionService --> AIGateway
    
    AIGateway --> RequestRouter
    AIGateway --> QueueManager
    AIGateway --> ModelManager
    
    RequestRouter --> DrawingAnalyzer
    RequestRouter --> DefectDetector
    RequestRouter --> AnnotationHelper
    RequestRouter --> VersionComparator
    RequestRouter --> QualityPredictor
    
    DrawingService --> PostgreSQL
    AnnotationService --> PostgreSQL
    DefectService --> PostgreSQL
    VersionService --> PostgreSQL
    NotificationService --> Redis
    SyncService --> Redis
    AnalyticsService --> TimescaleDB
    
    DrawingService --> MinIO
    AnnotationService --> MinIO
    VersionService --> MinIO
    
    AIGateway --> VectorDB
    
    QueueManager --> Redis
```

## 🤖 AI Gateway архитектура

```mermaid
graph TB
    subgraph "AI Gateway"
        subgraph "Request Processing"
            APIRouter[🛣️ API Router<br/>FastAPI]
            AuthMiddleware[🔐 Auth Middleware]
            RateLimiter[📊 Rate Limiter]
            RequestValidator[✅ Request Validator]
        end
        
        subgraph "Queue Management"
            TaskQueue[📋 Task Queue<br/>Celery + Redis]
            WorkerPool[👷 Worker Pool<br/>gunicorn + uvicorn]
            ResultCache[⚡ Result Cache<br/>Redis]
        end
        
        subgraph "Model Management"
            ModelRegistry[🗄️ Model Registry<br/>MLflow]
            ModelLoader[📦 Model Loader<br/>ONNX/TorchScript]
            ModelVersioning[🏷️ Versioning<br/>Git LFS]
        end
        
        subgraph "AI Services"
            DrawingAI[📐 Drawing Analysis<br/>Vision Transformers]
            DefectAI[🔍 Defect Detection<br/>YOLOv8 + ResNet]
            AnnotationAI[✏️ Annotation Helper<br/>GPT-4 + Vision]
            ComparisonAI[🔀 Version Comparison<br/>Siamese Networks]
            QualityAI[📈 Quality Prediction<br/>LSTM + XGBoost]
        end
    end
    
    subgraph "External AI"
        OpenAI[🧠 OpenAI API<br/>GPT-4 Vision]
        Gemini[🌟 Google Gemini<br/>Pro Vision]
        Anthropic[🧠 Anthropic Claude<br/>Vision Models]
        HuggingFace[🤗 HuggingFace<br/>Open Source Models]
    end
    
    subgraph "AI Infrastructure"
        GPU[🎮 GPU Cluster<br/>NVIDIA A100]
        ModelStorage[💾 Model Storage<br/>S3 + Registry]
        Monitoring[📈 Model Monitoring<br/>MLflow + Weights]
        Scaling[⚡ Auto Scaling<br/>K8s HPA]
    end
    
    %% AI Gateway connections
    APIRouter --> AuthMiddleware
    AuthMiddleware --> RateLimiter
    RateLimiter --> RequestValidator
    
    RequestValidator --> TaskQueue
    TaskQueue --> WorkerPool
    WorkerPool --> ResultCache
    
    WorkerPool --> ModelRegistry
    ModelRegistry --> ModelLoader
    ModelLoader --> ModelVersioning
    
    WorkerPool --> DrawingAI
    WorkerPool --> DefectAI
    WorkerPool --> AnnotationAI
    WorkerPool --> ComparisonAI
    WorkerPool --> QualityAI
    
    DrawingAI --> OpenAI
    DrawingAI --> Gemini
    DefectAI --> HuggingFace
    AnnotationAI --> OpenAI
    AnnotationAI --> Anthropic
    
    ModelRegistry --> ModelStorage
    WorkerPool --> Monitoring
    WorkerPool --> Scaling
```

## 🗄️ Архитектура данных

```mermaid
graph TB
    subgraph "Primary Database"
        PostgreSQL[(🐘 PostgreSQL<br/>Primary Data)]
        
        subgraph "Core Tables"
            Projects[📋 Projects]
            Drawings[📄 Drawings]
            Annotations[🎨 Annotations]
            Defects[🐛 Defects]
            Users[👥 Users]
            Companies[🏢 Companies]
        end
        
        subgraph "Relations"
            DrawingPages[📖 Drawing Pages]
            AnnotationHistory[📜 Annotation History]
            DrawingVersions[🔄 Drawing Versions]
            DefectMarkers[📍 Defect Markers]
            AnnotationPhotos[📷 Annotation Photos]
        end
    end
    
    subgraph "Cache Layer"
        Redis[(⚡ Redis)]
        
        subgraph "Cache Types"
            SessionCache[🔐 Sessions]
            QueryCache[🔍 Query Cache]
            FileCache[📁 File Cache]
            AIResultCache[🤖 AI Results]
        end
    end
    
    subgraph "Object Storage"
        MinIO[(📦 MinIO/S3)]
        
        subgraph "Storage Types"
            PDFFiles[📄 PDF Files]
            Images[🖼️ Images]
            Thumbnails[🎯 Thumbnails]
            Exports[📤 Exports]
            Backups[💾 Backups]
        end
    end
    
    subgraph "Vector Database"
        VectorDB[(🗄️ Vector DB)]
        
        subgraph "Vector Types"
            DrawingEmbeddings[📐 Drawing Embeddings]
            AnnotationEmbeddings[🎨 Annotation Embeddings]
            DefectEmbeddings[🐛 Defect Embeddings]
            UserEmbeddings[👤 User Embeddings]
        end
    end
    
    subgraph "Time Series DB"
        TimescaleDB[(📊 TimescaleDB)]
        
        subgraph "Metrics"
            UsageMetrics[📈 Usage Metrics]
            PerformanceMetrics[⚡ Performance Metrics]
            AIMetrics[🤖 AI Metrics]
            ErrorMetrics[❌ Error Metrics]
        end
    end
    
    subgraph "Search Index"
        Elasticsearch[(🔍 Elasticsearch)]
        
        subgraph "Index Types"
            DrawingIndex[📄 Drawing Index]
            AnnotationIndex[🎨 Annotation Index]
            DefectIndex[🐛 Defect Index]
            UserIndex[👥 User Index]
        end
    end
    
    %% Data flow connections
    PostgreSQL --> Redis
    PostgreSQL --> MinIO
    PostgreSQL --> VectorDB
    PostgreSQL --> TimescaleDB
    PostgreSQL --> Elasticsearch
    
    Redis --> PostgreSQL
    MinIO --> PostgreSQL
    VectorDB --> PostgreSQL
    TimescaleDB --> PostgreSQL
    Elasticsearch --> PostgreSQL
```

## 🔄 Архитектура синхронизации

```mermaid
graph TB
    subgraph "Client Side"
        MobileClient[📱 Mobile Client]
        WebClient[🌐 Web Client]
        
        subgraph "Local Storage"
            SQLite[(💾 SQLite)]
            FileSystem[📁 File System]
            Cache[⚡ Cache]
        end
        
        subgraph "Sync Manager"
            ConflictDetector[⚠️ Conflict Detector]
            ChangeTracker[📝 Change Tracker]
            QueueManager[📋 Queue Manager]
        end
    end
    
    subgraph "Server Side"
        SyncAPI[🔄 Sync API]
        ConflictResolver[🔧 Conflict Resolver]
        ChangeProcessor[⚙️ Change Processor]
        
        subgraph "Server Storage"
            PostgreSQL[(🐘 PostgreSQL)]
            Redis[(⚡ Redis)]
            MinIO[(📦 MinIO)]
        end
    end
    
    subgraph "Sync Process"
        subgraph "Upload Flow"
            DetectChanges[🔍 Detect Changes]
            CreateBatch[📦 Create Batch]
            UploadBatch[⬆️ Upload Batch]
            ProcessServer[⚙️ Process Server]
        end
        
        subgraph "Download Flow"
            CheckServer[🔍 Check Server]
            DownloadChanges[⬇️ Download Changes]
            ApplyChanges[✅ Apply Changes]
            UpdateLocal[🔄 Update Local]
        end
        
        subgraph "Conflict Resolution"
            IdentifyConflicts[⚠️ Identify Conflicts]
            ResolveConflicts[🔧 Resolve Conflicts]
            MergeChanges[🔀 Merge Changes]
            NotifyUser[📬 Notify User]
        end
    end
    
    %% Sync flow connections
    MobileClient --> SQLite
    WebClient --> FileSystem
    
    SQLite --> ConflictDetector
    FileSystem --> ChangeTracker
    
    ConflictDetector --> QueueManager
    ChangeTracker --> QueueManager
    
    QueueManager --> SyncAPI
    SyncAPI --> ConflictResolver
    ConflictResolver --> ChangeProcessor
    
    ChangeProcessor --> PostgreSQL
    ChangeProcessor --> Redis
    ChangeProcessor --> MinIO
    
    %% Process connections
    DetectChanges --> CreateBatch
    CreateBatch --> UploadBatch
    UploadBatch --> ProcessServer
    
    CheckServer --> DownloadChanges
    DownloadChanges --> ApplyChanges
    ApplyChanges --> UpdateLocal
    
    IdentifyConflicts --> ResolveConflicts
    ResolveConflicts --> MergeChanges
    MergeChanges --> NotifyUser
```

## 📊 Архитектура аналитики и мониторинга

```mermaid
graph TB
    subgraph "Data Collection"
        subgraph "Application Metrics"
            APIMetrics[🔌 API Metrics]
            UserMetrics[👤 User Metrics]
            FeatureMetrics[⚡ Feature Metrics]
            ErrorMetrics[❌ Error Metrics]
        end
        
        subgraph "System Metrics"
            CPUMetrics[💻 CPU Metrics]
            MemoryMetrics[🧠 Memory Metrics]
            NetworkMetrics[🌐 Network Metrics]
            StorageMetrics[💾 Storage Metrics]
        end
        
        subgraph "Business Metrics"
            DrawingMetrics[📄 Drawing Metrics]
            AnnotationMetrics[🎨 Annotation Metrics]
            DefectMetrics[🐛 Defect Metrics]
            QualityMetrics[📈 Quality Metrics]
        end
    end
    
    subgraph "Processing Layer"
        MetricsCollector[📊 Metrics Collector]
        EventProcessor[⚙️ Event Processor]
        Aggregator[🔢 Aggregator]
        AlertEngine[🚨 Alert Engine]
    end
    
    subgraph "Storage Layer"
        TimescaleDB[(📊 TimescaleDB)]
        Prometheus[(📈 Prometheus)]
        Loki[(📝 Loki)]
        ElasticSearch[(🔍 ElasticSearch)]
    end
    
    subgraph "Visualization Layer"
        Grafana[📊 Grafana Dashboard]
        Kibana[🔍 Kibana Analytics]
        CustomDashboard[🎯 Custom Dashboard]
        AlertManager[🚨 Alert Manager]
    end
    
    subgraph "AI Monitoring"
        ModelPerformance[🤖 Model Performance]
        PredictionAccuracy[🎯 Prediction Accuracy]
        DataDrift[📉 Data Drift]
        ModelExplainability[🔍 Model Explainability]
    end
    
    %% Collection connections
    APIMetrics --> MetricsCollector
    UserMetrics --> MetricsCollector
    FeatureMetrics --> MetricsCollector
    ErrorMetrics --> MetricsCollector
    
    CPUMetrics --> MetricsCollector
    MemoryMetrics --> MetricsCollector
    NetworkMetrics --> MetricsCollector
    StorageMetrics --> MetricsCollector
    
    DrawingMetrics --> EventProcessor
    AnnotationMetrics --> EventProcessor
    DefectMetrics --> EventProcessor
    QualityMetrics --> EventProcessor
    
    %% Processing connections
    MetricsCollector --> Aggregator
    EventProcessor --> Aggregator
    Aggregator --> AlertEngine
    
    %% Storage connections
    Aggregator --> TimescaleDB
    MetricsCollector --> Prometheus
    EventProcessor --> Loki
    AlertEngine --> ElasticSearch
    
    %% Visualization connections
    TimescaleDB --> Grafana
    Prometheus --> Grafana
    Loki --> Grafana
    ElasticSearch --> Kibana
    
    Grafana --> CustomDashboard
    AlertEngine --> AlertManager
    
    %% AI Monitoring connections
    Grafana --> ModelPerformance
    Grafana --> PredictionAccuracy
    Grafana --> DataDrift
    Grafana --> ModelExplainability
```

## 🔐 Архитектура безопасности

```mermaid
graph TB
    subgraph "Authentication Layer"
        AuthProvider[🔐 Auth Provider<br/>OAuth2 + OIDC]
        JWTService[🎫 JWT Service]
        MFAService[🔐 MFA Service]
        PasswordManager[🔑 Password Manager]
    end
    
    subgraph "Authorization Layer"
        RBAC[👥 RBAC<br/>Role-Based Access Control]
        ABAC[🔒 ABAC<br/>Attribute-Based Access Control]
        PolicyEngine[📋 Policy Engine]
        PermissionChecker[✅ Permission Checker]
    end
    
    subgraph "API Security"
        RateLimiting[📊 Rate Limiting]
        InputValidation[✅ Input Validation]
        OutputEncoding[🔒 Output Encoding]
        CORS[🌐 CORS]
    end
    
    subgraph "Data Security"
        EncryptionAtRest[🔒 Encryption at Rest<br/>AES-256]
        EncryptionInTransit[🔐 Encryption in Transit<br/>TLS 1.3]
        DataMasking[🎭 Data Masking]
        Tokenization[🎫 Tokenization]
    end
    
    subgraph "Monitoring & Auditing"
        AuditLogger[📝 Audit Logger]
        SecurityEvents[🚨 Security Events]
        IntrusionDetection[🔍 Intrusion Detection]
        ComplianceChecker[✅ Compliance Checker]
    end
    
    subgraph "Infrastructure Security"
        Firewall[🔥 Firewall]
        WAF[🛡️ Web Application Firewall]
        DDoSProtection[⚡ DDoS Protection]
        NetworkSegmentation[🌐 Network Segmentation]
    end
    
    %% Security flow
    AuthProvider --> JWTService
    JWTService --> MFAService
    MFAService --> PasswordManager
    
    JWTService --> RBAC
    RBAC --> ABAC
    ABAC --> PolicyEngine
    PolicyEngine --> PermissionChecker
    
    PermissionChecker --> RateLimiting
    RateLimiting --> InputValidation
    InputValidation --> OutputEncoding
    OutputEncoding --> CORS
    
    CORS --> EncryptionAtRest
    EncryptionAtRest --> EncryptionInTransit
    EncryptionInTransit --> DataMasking
    DataMasking --> Tokenization
    
    Tokenization --> AuditLogger
    AuditLogger --> SecurityEvents
    SecurityEvents --> IntrusionDetection
    IntrusionDetection --> ComplianceChecker
    
    ComplianceChecker --> Firewall
    Firewall --> WAF
    WAF --> DDoSProtection
    DDoSProtection --> NetworkSegmentation
```

---

Эти архитектурные диаграммы обеспечивают комплексное представление системы технического надзора с PDF чертежами, охватывая все уровни от пользовательских интерфейсов до инфраструктуры и безопасности.
