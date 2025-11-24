# Архитектурная схема новой системы "Строй-Контроль"

## 1. Модульная архитектура

### 1.1 Микросервисная структура фронтенда
```mermaid
graph TB
    subgraph "App Shell (Host)"
        Auth[🔐 Authentication Core]
        Routing[🛣️ Universal Router]
        Layout[📐 Layout System]
        Theme[🎨 Theme Manager]
        State[⚡ State Management]
    end
    
    subgraph "Module Federation System"
        Registry[📋 Module Registry]
        Loader[🔄 Module Loader]
        Manager[⚙️ Module Manager]
        Billing[💳 Billing System]
    end
    
    subgraph "Core Modules (Built-in)"
        Projects[📋 Projects]
        Estimates[💰 Estimates]
        Finance[📊 Finance]
        CRM[👥 CRM]
        Documents[📄 Documents]
    end
    
    subgraph "Extended Modules"
        AIAssistant[🤖 AI Assistant]
        Analytics[📈 Analytics]
        Automation[🔄 Automation]
        Mobile[📱 Mobile Features]
        Marketplace[🛒 Marketplace]
    end
    
    subgraph "Shared Services"
        UI[🎨 UI Components]
        Utils[🛠️ Utilities]
        Storage[💾 Storage Service]
        Cache[⚡ Cache Service]
        Notifications[🔔 Notifications]
    end
    
    Auth --> Registry
    Routing --> Manager
    Layout --> Theme
    State --> Storage
    
    Registry --> Loader
    Loader --> Projects
    Loader --> Estimates
    Loader --> Finance
    Loader --> CRM
    Loader --> Documents
    
    Manager --> AIAssistant
    Manager --> Analytics
    Manager --> Automation
    Manager --> Mobile
    Manager --> Marketplace
    
    Billing --> AllModules
    
    Projects --> UI
    Projects --> Utils
    Projects --> Cache
    Projects --> Notifications
    
    subgraph "Subscription Tiers"
        Free[🆓 Free Tier]
        Pro[💼 Professional]
        Enterprise[🏢 Enterprise]
        Custom[⚙️ Custom]
    end
    
    Billing --> Free
    Billing --> Pro
    Billing --> Enterprise
    Billing --> Custom
```

### 1.2 Module Federation Architecture
```mermaid
graph TB
    subgraph "Host Application"
        Shell[🏗️ Shell Application]
        Config[⚙️ Module Config]
        Router[🛣️ Module Router]
        Auth[🔐 Auth Guard]
    end
    
    subgraph "Remote Modules"
        Projects[📋 Projects Module]
        Finance[📊 Finance Module]
        CRM[👥 CRM Module]
        AI[🤖 AI Module]
        Analytics[📈 Analytics Module]
        Reports[📋 Reports Module]
        Documents[📄 Documents Module]
        Settings[⚙️ Settings Module]
    end
    
    subgraph "Shared Dependencies"
        ReactLib[⚛️ React Library]
        UILib[🎨 UI Components]
        UtilsLib[🛠️ Utils]
        Types[📝 Type Definitions]
    end
    
    Shell --> Router
    Router --> Auth
    Auth --> Projects
    Auth --> Finance
    Auth --> CRM
    Auth --> AI
    Auth --> Analytics
    Auth --> Reports
    Auth --> Documents
    Auth --> Settings
    
    Projects -.-> ReactLib
    Finance -.-> ReactLib
    CRM -.-> ReactLib
    AI -.-> ReactLib
    Analytics -.-> ReactLib
    Reports -.-> ReactLib
    Documents -.-> ReactLib
    Settings -.-> ReactLib
    
    Projects -.-> UILib
    Finance -.-> UILib
    CRM -.-> UILib
    AI -.-> UILib
    Analytics -.-> UILib
    Reports -.-> UILib
    Documents -.-> UILib
    Settings -.-> UILib
```

## 2. Система доступа и подписок

### 2.1 Access Control Flow
```mermaid
sequenceDiagram
    participant User
    participant Auth
    participant Module
    participant Billing
    participant Cache
    
    User->>Auth: Login Request
    Auth->>Auth: Validate Credentials
    Auth->>Billing: Get User Subscription
    Billing-->>Auth: Subscription Data
    Auth-->>User: JWT + Access Token
    
    User->>Module: Access Module
    Module->>Auth: Validate Token
    Auth-->>Module: User Permissions
    Module->>Billing: Check Module Access
    Billing-->>Module: Access Granted/Denied
    
    alt Access Granted
        Module-->>User: Render Module UI
    else Access Denied
        Module->>User: Show Upgrade Prompt
        Module->>User: Limited View
    end
    
    Note over User,Cache: Cache access for performance
    Module->>Cache: Store Access Decision
```

### 2.2 Subscription Tiers Visualization
```mermaid
graph LR
    subgraph "Subscription Models"
        Free[🆓<br/>Free Tier<br/>- 3 projects<br/>- Basic features<br/>- Email support]
        
        Pro[💼<br/>Professional<br/>- 50 projects<br/>- All modules<br/>- Priority support<br/>- AI unlimited]
        
        Enterprise[🏢<br/>Enterprise<br/>- Unlimited projects<br/>- Custom modules<br/>- API access<br/>- Dedicated support]
        
        Custom[⚙️<br/>Custom<br/>- Modular selection<br/>- Custom development<br/>- On-premise<br/>- SLA]
    end
    
    subgraph "Features Matrix"
        Projects[Projects Module]
        Estimates[Estimates Module]
        Finance[Finance Module]
        CRM[CRM Module]
        AI[AI Assistant]
        Analytics[Analytics]
        Reports[Advanced Reports]
        API[API Access]
        Integration[Integrations]
        Mobile[Mobile App]
    end
    
    Free --> Projects
    Free --> Estimates
    Free --> AI
    Pro --> Projects
    Pro --> Estimates
    Pro --> Finance
    Pro --> CRM
    Pro --> AI
    Pro --> Analytics
    Enterprise --> AllModules
    Custom --> Projects
    Custom --> Estimates
    Custom --> Custom
```

## 3. Система виджетов и дашбордов

### 3.1 Widget System Architecture
```mermaid
graph TB
    subgraph "Widget System"
        Registry[📋 Widget Registry]
        Builder[🔧 Dashboard Builder]
        Renderer[🎨 Widget Renderer]
        Config[⚙️ Widget Config]
    end
    
    subgraph "Widget Types"
        Chart[📊 Charts]
        KPI[📈 KPI Cards]
        Table[📋 Data Tables]
        Calendar[📅 Calendar]
        Map[🗺️ Maps]
        Image[🖼️ Images]
        Text[📝 Text Blocks]
        Actions[⚡ Actions]
    end
    
    subgraph "Widget Properties"
        Settings[⚙️ Settings Panel]
        Data[📊 Data Source]
        Style[🎨 Styling Options]
        Layout[📐 Layout Config]
        Events[🔔 Event Handlers]
    end
    
    Registry --> Builder
    Builder --> Renderer
    Config --> Renderer
    
    Renderer --> Chart
    Renderer --> KPI
    Renderer --> Table
    Renderer --> Calendar
    Renderer --> Map
    Renderer --> Image
    Renderer --> Text
    Renderer --> Actions
    
    Settings --> Chart
    Settings --> KPI
    Settings --> Table
    Settings --> Calendar
    Settings --> Map
    Settings --> Image
    Settings --> Text
    Settings --> Actions
```

### 3.2 Dashboard Builder Flow
```mermaid
flowchart TD
    Start[🎯 Start Building Dashboard] --> Choose[📋 Choose Template]
    
    Choose --> Layout[📐 Select Layout]
    Layout --> Widgets[📱 Add Widgets]
    
    Widgets --> Config[⚙️ Configure Widgets]
    Config --> Style[🎨 Style Settings]
    
    Style --> Preview[👀 Preview Dashboard]
    Preview --> Save[💾 Save Dashboard]
    Save --> Share[🔗 Share Dashboard]
    
    Config --> Widgets
    Style --> Widgets
    Preview --> Config
    
    subgraph "Widget Library"
        A[📊 Financial KPIs]
        B[📈 Project Progress]
        C[👥 Team Status]
        D[📋 Recent Activities]
        E[🎯 AI Insights]
        F[📅 Upcoming Tasks]
    end
    
    Widgets --> A
    Widgets --> B
    Widgets --> C
    Widgets --> D
    Widgets --> E
    Widgets --> F
```

## 4. AI Assistant Extension

### 4.1 Enhanced AI Architecture
```mermaid
graph TB
    subgraph "AI Assistant Core"
        Processor[🧠 AI Processor]
        Multimodal[🎤 Multimodal Input]
        Context[📚 Context Manager]
        Learning[📈 Learning Engine]
    end
    
    subgraph "Input Methods"
        Voice[🎤 Voice Input]
        Text[⌨️ Text Input]
        Image[📷 Image Analysis]
        Document[📄 Document Processing]
    end
    
    subgraph "AI Providers"
        Gemini[🌟 Google Gemini]
        GPT[🧠 OpenAI GPT]
        Claude[🤖 Anthropic Claude]
        Local[🏠 Local Models]
    end
    
    subgraph "AI Capabilities"
        Chat[💬 Conversational AI]
        Analysis[📊 Data Analysis]
        Generation[⚡ Content Generation]
        Prediction[🔮 Predictive Analytics]
        Automation[🔄 Process Automation]
    end
    
    Voice --> Multimodal
    Text --> Multimodal
    Image --> Multimodal
    Document --> Multimodal
    
    Multimodal --> Processor
    Context --> Processor
    Learning --> Processor
    
    Processor --> Chat
    Processor --> Analysis
    Processor --> Generation
    Processor --> Prediction
    Processor --> Automation
    
    Processor --> Gemini
    Processor --> GPT
    Processor --> Claude
    Processor --> Local
```

### 4.2 Voice Assistant Flow
```mermaid
sequenceDiagram
    participant User
    participant Voice
    participant STT
    participant AI
    participant TTS
    participant Action
    
    User->>Voice: Press Voice Button
    Voice->>User: Start Listening
    User->>Voice: Say Command
    Voice->>STT: Speech to Text
    STT->>AI: Process Command
    
    AI->>AI: Analyze Intent
    AI->>Action: Execute Action
    
    alt Success
        Action->>AI: Action Result
        AI->>TTS: Generate Response
        TTS->>User: Speak Response
    else Error
        AI->>TTS: Error Message
        TTS->>User: Error Audio
    end
    
    Note over User,Action: Examples:<br/>"Создать новый проект"<br/>"Показать финансы за месяц"<br/>"Записать заметку"
```

## 5. Мобильная адаптация и PWA

### 5.1 PWA Architecture
```mermaid
graph TB
    subgraph "PWA Features"
        ServiceWorker[🔄 Service Worker]
        Manifest[📱 Web App Manifest]
        Cache[💾 Cache Strategy]
        Push[📲 Push Notifications]
        Offline[🚫 Offline Mode]
    end
    
    subgraph "Mobile Optimizations"
        Touch[👆 Touch Gestures]
        Responsive[📱 Responsive Design]
        Performance[⚡ Performance]
        Battery[🔋 Battery Optimization]
        Storage[💾 Local Storage]
    end
    
    subgraph "Mobile Features"
        Camera[📷 Camera Access]
        GPS[📍 Geolocation]
        Contacts[👥 Contact Access]
        Share[🔗 Native Sharing]
        Biometric[🔐 Biometric Auth]
    end
    
    ServiceWorker --> Cache
    ServiceWorker --> Push
    ServiceWorker --> Offline
    
    Manifest --> Touch
    Manifest --> Responsive
    Manifest --> Performance
    
    Cache --> Battery
    Cache --> Storage
    
    Camera --> Push
    GPS --> Offline
    Contacts --> Share
    Biometric --> Auth
```

### 5.2 Mobile UI Adaptations
```mermaid
graph LR
    subgraph "Desktop View"
        A[🖥️ Sidebar Navigation]
        B[📊 Full Dashboard]
        C[📋 Wide Tables]
    end
    
    subgraph "Tablet View"
        D[📱 Collapsible Sidebar]
        E[📊 Adaptive Charts]
        F[📋 Scrollable Tables]
    end
    
    subgraph "Mobile View"
        G[📱 Bottom Navigation]
        H[📊 Simplified Dashboard]
        I[📋 Card Lists]
        J[🔍 Quick Actions]
    end
    
    A --> D
    A --> G
    B --> E
    B --> H
    C --> F
    C --> I
    C --> J
```

## 6. Система шаблонов и автоматизации

### 6.1 Template System
```mermaid
graph TB
    subgraph "Template Engine"
        Registry[📋 Template Registry]
        Compiler[⚡ Template Compiler]
        Engine[🛠️ Template Engine]
        Validator[✅ Template Validator]
    end
    
    subgraph "Template Types"
        Document[📄 Document Templates]
        Email[📧 Email Templates]
        Report[📊 Report Templates]
        Project[📋 Project Templates]
        Workflow[🔄 Workflow Templates]
    end
    
    subgraph "Template Features"
        Variables[📝 Variables]
        Logic[🧠 Logic Statements]
        Functions[⚙️ Functions]
        Filters[🔍 Filters]
        Inheritance[🏗️ Inheritance]
    end
    
    Registry --> Compiler
    Compiler --> Engine
    Engine --> Validator
    
    Engine --> Document
    Engine --> Email
    Engine --> Report
    Engine --> Project
    Engine --> Workflow
    
    Variables --> Document
    Logic --> Document
    Functions --> Document
    Filters --> Document
    Inheritance --> Document
    
    Variables --> Email
    Logic --> Email
    Functions --> Email
    Filters --> Email
    Inheritance --> Email
    
    Variables --> Report
    Logic --> Report
    Functions --> Report
    Filters --> Report
    Inheritance --> Report
```

### 6.2 Automation Workflow
```mermaid
flowchart TD
    Start[🎯 Trigger Event] --> Condition[✅ Check Conditions]
    
    Condition -->|True| Action1[⚡ Execute Action 1]
    Condition -->|False| End[❌ End]
    
    Action1 --> Delay1[⏱️ Wait/Delay]
    Delay1 --> Condition2[✅ Check Next Conditions]
    
    Condition2 -->|True| Action2[⚡ Execute Action 2]
    Condition2 -->|False| Action1
    
    Action2 --> Notification[📢 Send Notification]
    Notification --> Log[📝 Log Event]
    Log --> End
    
    subgraph "Trigger Types"
        Time[⏰ Time-based]
        User[👤 User Action]
        System[⚙️ System Event]
        External[🌐 External API]
    end
    
    subgraph "Actions"
        Create[📋 Create Record]
        Update[✏️ Update Data]
        Send[📧 Send Message]
        Calculate[🧮 Calculate Values]
        Report[📊 Generate Report]
    end
    
    Time --> Start
    User --> Start
    System --> Start
    External --> Start
    
    Action1 --> Create
    Action1 --> Update
    Action2 --> Send
    Action2 --> Calculate
    Action2 --> Report
```

## 7. Аналитика и отчетность

### 7.1 BI Dashboard Architecture
```mermaid
graph TB
    subgraph "Data Layer"
        Sources[📊 Data Sources]
        ETL[🔄 ETL Pipeline]
        Warehouse[🗄️ Data Warehouse]
        Cache[⚡ Cache Layer]
    end
    
    subgraph "Analytics Engine"
        Query[📋 Query Engine]
        Calculation[🧮 Calculations]
        Aggregation[📊 Aggregations]
        Visualization[🎨 Visualization]
    end
    
    subgraph "Report Types"
        KPI[📈 KPI Reports]
        Trend[📊 Trend Analysis]
        Comparison[🔍 Comparative]
        Predictive[🔮 Predictive]
        Custom[⚙️ Custom Reports]
    end
    
    subgraph "Visualizations"
        Charts[📊 Charts]
        Tables[📋 Tables]
        Maps[🗺️ Maps]
        Graphs[🕸️ Network Graphs]
        Heatmaps[🌡️ Heatmaps]
    end
    
    Sources --> ETL
    ETL --> Warehouse
    Warehouse --> Cache
    
    Cache --> Query
    Query --> Calculation
    Calculation --> Aggregation
    Aggregation --> Visualization
    
    Query --> KPI
    Query --> Trend
    Query --> Comparison
    Query --> Predictive
    Query --> Custom
    
    Visualization --> Charts
    Visualization --> Tables
    Visualization --> Maps
    Visualization --> Graphs
    Visualization --> Heatmaps
```

### 7.2 Real-time Analytics
```mermaid
sequenceDiagram
    participant App
    participant WebSocket
    participant Analytics
    participant Cache
    participant Database
    
    App->>WebSocket: Connect
    WebSocket->>Analytics: Subscribe to Updates
    
    loop Real-time Updates
        Database->>Analytics: Data Change
        Analytics->>Analytics: Process Update
        Analytics->>Cache: Update Cache
        Analytics->>WebSocket: Send Update
        WebSocket->>App: Push Update
        App->>App: Update UI
    end
    
    App->>Analytics: Request Report
    Analytics->>Cache: Check Cache
    alt Cache Hit
        Cache->>Analytics: Return Cached Data
    else Cache Miss
        Analytics->>Database: Query Database
        Database->>Analytics: Return Data
        Analytics->>Cache: Cache Result
    end
    Analytics->>App: Send Report Data
```

## 8. Marketplace и расширения

### 8.1 Module Marketplace
```mermaid
graph TB
    subgraph "Marketplace"
        Store[🛒 Module Store]
        Browse[🔍 Browse Modules]
        Search[🔎 Search & Filter]
        Download[⬇️ Download/Install]
    end
    
    subgraph "Module Categories"
        Construction[🏗️ Construction]
        Finance[💰 Finance]
        Integration[🔗 Integration]
        AI[🤖 AI Extensions]
        Reporting[📊 Reporting]
        Mobile[📱 Mobile]
    end
    
    subgraph "Module Quality"
        Review[⭐ Reviews & Ratings]
        Testing[🧪 Quality Testing]
        Certification[✅ Certification]
        Security[🔐 Security Scan]
    end
    
    subgraph "Developer Tools"
        SDK[🛠️ Module SDK]
        Templates[📋 Module Templates]
        Documentation[📚 Documentation]
        Testing[🧪 Testing Tools]
    end
    
    Store --> Browse
    Browse --> Search
    Search --> Download
    
    Search --> Construction
    Search --> Finance
    Search --> Integration
    Search --> AI
    Search --> Reporting
    Search --> Mobile
    
    Download --> Review
    Review --> Testing
    Testing --> Certification
    Certification --> Security
    
    Download --> SDK
    SDK --> Templates
    SDK --> Documentation
    SDK --> Testing
```

### 8.2 Extension Development
```mermaid
flowchart TD
    Start[👨‍💻 Developer Starts] --> Install[⬇️ Install SDK]
    
    Install --> Template[📋 Generate Template]
    Template --> Develop[💻 Develop Module]
    Develop --> Test[🧪 Test Module]
    
    Test -->|Pass| Package[📦 Package Module]
    Test -->|Fail| Develop
    
    Package --> Submit[📤 Submit to Store]
    Submit --> Review[⭐ Store Review]
    
    Review -->|Approved| Publish[🚀 Publish Module]
    Review -->|Rejected| Fix[🔧 Fix Issues]
    Fix --> Test
    
    Publish --> Monetize[💰 Enable Monetization]
    Monetize --> Updates[🔄 Support & Updates]
    
    subgraph "Development Steps"
        A[📝 Define Module API]
        B[🎨 Create UI Components]
        C[⚙️ Implement Logic]
        D[🔒 Handle Authentication]
        E[📊 Manage Data]
        F[🧪 Write Tests]
        G[📚 Write Documentation]
    end
    
    Develop --> A
    Develop --> B
    Develop --> C
    Develop --> D
    Develop --> E
    Develop --> F
    Develop --> G
```

---

**Схема создана:** 24.11.2024  
**Версия:** 1.0  
**Назначение:** Визуализация архитектуры новой системы "Строй-Контроль"