# План оптимизации производительности системы "Строй-Контроль"

## Обзор оптимизации производительности

Данный документ описывает комплексную стратегию оптимизации производительности для системы "Строй-Контроль", включающую все уровни архитектуры от frontend до базы данных.

### Цели оптимизации
- ⚡ Время ответа API < 200ms (P95)
- 🚀 Время загрузки страниц < 3 секунды
- 📈 Поддержка 1000+ одновременных пользователей
- 💾 Эффективное использование ресурсов
- 🔄 Масштабируемость системы

## Мониторинг производительности

### Ключевые метрики (KPIs)

#### Backend метрики
```go
// metrics/backend.go
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    // Request metrics
    RequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "HTTP request duration in seconds",
            Buckets: []float64{0.1, 0.25, 0.5, 1, 2.5, 5, 10},
        },
        []string{"method", "endpoint", "status_code"},
    )

    RequestTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status_code"},
    )

    // Database metrics
    DatabaseQueryDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "database_query_duration_seconds",
            Help: "Database query duration in seconds",
            Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1},
        },
        []string{"query_type", "table"},
    )

    DatabaseConnections = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "database_connections_active",
            Help: "Number of active database connections",
        },
        []string{"state"},
    )

    // Cache metrics
    CacheHitRate = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "cache_hit_rate",
            Help: "Cache hit rate",
            Buckets: []float64{0.5, 0.75, 0.9, 0.95, 0.99, 1.0},
        },
        []string{"cache_name"},
    )
)
```

#### Frontend метрики
```typescript
// utils/performance.ts
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    pageLoadTime: 0,
    timeToFirstByte: 0,
    timeToFirstPaint: 0,
    timeToInteractive: 0,
    cumulativeLayoutShift: 0,
    firstInputDelay: 0,
    largestContentfulPaint: 0
  };

  measurePageLoad() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    this.metrics.timeToFirstByte = navigation.responseStart - navigation.requestStart;
    this.metrics.timeToFirstPaint = performance.getEntriesByType('paint')
      .find(entry => entry.name === 'first-paint')?.startTime || 0;
    this.metrics.pageLoadTime = navigation.loadEventEnd - navigation.navigationStart;
    
    // Отправка метрик
    this.sendMetrics('page_load', this.metrics);
  }

  measureUserInteraction() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'first-input') {
          this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
          this.sendMetrics('user_interaction', { firstInputDelay: this.metrics.firstInputDelay });
        }
      }
    }).observe({ entryTypes: ['first-input'] });
  }

  private sendMetrics(type: string, data: any) {
    fetch('/api/v1/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data, timestamp: Date.now() })
    });
  }
}
```

### Мониторинг в реальном времени

```yaml
# monitoring/performance-rules.yml
groups:
  - name: performance_alerts
    rules:
      - alert: HighAPIResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.2
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "High API response time"
          description: "95th percentile response time is {{ $value }}s, threshold is 0.2s"

      - alert: DatabaseSlowQueries
        expr: histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m])) > 1.0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Slow database queries detected"
          description: "95th percentile query time is {{ $value }}s"

      - alert: LowCacheHitRate
        expr: rate(cache_hits_total[5m]) / rate(cache_requests_total[5m]) < 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value }}, expected > 0.8"

      - alert: HighMemoryUsage
        expr: (process_resident_memory_bytes / 1024 / 1024) > 512
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}MB"
```

## Backend оптимизация

### Go оптимизации

#### Конфигурация Gin
```go
// config/performance.go
package config

import (
    "time"

    "github.com/gin-gonic/gin"
)

func ConfigureGinPerformance() *gin.Engine {
    gin.SetMode(gin.ReleaseMode)
    
    engine := gin.New()
    
    // Настройка пула горутин
    engine.SetMaxConcurrentRequests(1000)
    
    // Настройка buffer size
    engine.RedirectTrailingSlash = true
    engine.RedirectFixedPath = true
    engine.HandleMethodNotAllowed = true
    
    // Отключение debug в production
    gin.DisableConsoleColor()
    
    // Настройка middleware для производительности
    engine.Use(
        gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
            return fmt.Sprintf("%s - [%s] \"%s %s %s %d %s %s %s %s\"\n",
                param.ClientIP,
                param.TimeStamp.Format(time.RFC1123),
                param.Method,
                param.Path,
                param.Request.Proto,
                param.StatusCode,
                param.Latency,
                param.Request.UserAgent,
                param.ErrorMessage,
                param.BodySize,
            )
        }),
        gin.Recovery(),
        corsMiddleware,
        rateLimitMiddleware,
    )
    
    return engine
}
```

#### Оптимизация HTTP обработчиков
```go
// handlers/project_handler.go
package handlers

import (
    "strconv"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/gocache" // Псевдоним для демонстрации
)

type ProjectHandler struct {
    projectService *services.ProjectService
    cache          *cache.Cache
}

func (h *ProjectHandler) GetProjects(c *gin.Context) {
    start := time.Now()
    
    // Параметры пагинации
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
    offset := (page - 1) * limit

    // Проверка кэша
    cacheKey := fmt.Sprintf("projects:page:%d:limit:%d", page, limit)
    if cached := h.cache.Get(c, cacheKey); cached != nil {
        c.JSON(200, gin.H{
            "data": cached,
            "meta": gin.H{
                "page":  page,
                "limit": limit,
                "from_cache": true,
            },
        })
        return
    }

    // База данных запрос
    projects, total, err := h.projectService.GetPaginatedProjects(offset, limit)
    if err != nil {
        c.JSON(500, gin.H{"error": "Failed to fetch projects"})
        return
    }

    // Кэширование результата
    h.cache.Set(c, cacheKey, projects, 5*time.Minute)

    // Запись метрик
    duration := time.Since(start)
    metrics.RequestDuration.WithLabelValues("GET", "/projects", "200").Observe(duration.Seconds())
    
    c.JSON(200, gin.H{
        "data": projects,
        "meta": gin.H{
            "page":     page,
            "limit":    limit,
            "total":    total,
            "from_cache": false,
            "duration_ms": duration.Milliseconds(),
        },
    })
}
```

### Оптимизация базы данных

#### PostgreSQL конфигурация
```sql
-- config/postgresql.conf
-- Основные настройки производительности
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200

-- Оптимизация для read-heavy workload
max_connections = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB

-- Индексы для производительности
CREATE INDEX CONCURRENTLY idx_projects_status_customer 
ON projects(status, customer_id) 
WHERE status != 'cancelled';

CREATE INDEX CONCURRENTLY idx_estimates_project_status 
ON estimates(project_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_transactions_project_date 
ON transactions(project_id, transaction_date DESC, type);

-- Partial indexes для частых запросов
CREATE INDEX CONCURRENTLY idx_users_active 
ON users(email, role) 
WHERE is_active = true;

-- Композитные индексы для сложных запросов
CREATE INDEX CONCURRENTLY idx_estimate_items_composite 
ON estimate_items(estimate_id, item_type, "order", parent_id);
```

#### Оптимизация запросов
```go
// repository/project_repository.go
package repository

import (
    "context"
    "fmt"

    "gorm.io/gorm"
    "gorm.io/gorm/clause"
)

type ProjectRepository struct {
    db *gorm.DB
}

func (r *ProjectRepository) GetPaginatedProjects(offset, limit int) ([]Project, int64, error) {
    var projects []Project
    var total int64

    // Использование count для точного подсчета
    tx := r.db.Model(&Project{}).Count(&total)
    if tx.Error != nil {
        return nil, 0, tx.Error
    }

    // Оптимизированный запрос с preloading
    tx = r.db.Preload("Customer").
         Preload("Team", func(db *gorm.DB) *gorm.DB {
             return db.Select("id", "user_id", "project_id", "role")
         }).
         Offset(offset).
         Limit(limit).
         Order("created_at DESC").
         Find(&projects)

    if tx.Error != nil {
        return nil, 0, tx.Error
    }

    return projects, total, nil
}

func (r *ProjectRepository) GetProjectsWithStats(ctx context.Context, userID string) ([]ProjectWithStats, error) {
    // Использование subqueries для производительности
    var projects []ProjectWithStats
    
    query := r.db.Table("projects p").
        Select(`
            p.*,
            u.name as customer_name,
            COUNT(DISTINCT e.id) as estimates_count,
            COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as total_amount,
            COUNT(DISTINCT t.id) as transactions_count
        `).
        Joins("LEFT JOIN users u ON p.customer_id = u.id").
        Joins("LEFT JOIN estimates e ON p.id = e.project_id").
        Joins("LEFT JOIN transactions t ON p.id = t.project_id").
        Where("p.status != ?", "cancelled").
        Group("p.id, u.name").
        Order("p.created_at DESC")

    tx := query.Scan(&projects)
    
    return projects, tx.Error
}
```

#### Connection pooling
```go
// database/connection.go
package database

import (
    "time"

    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

func NewConnection() (*gorm.DB, error) {
    config := &gorm.Config{
        Logger: logger.Default.LogMode(logger.Info),
        PrepareStmt: true, // Включение prepared statements
    }

    db, err := gorm.Open(postgres.New(postgres.Config{
        DSN: "postgres://user:password@localhost:5432/dbname",
        PreferSimpleProtocol: true,
        ConnectRetryAttempts: 3,
    }), config)
    
    if err != nil {
        return nil, err
    }

    // Настройка connection pool
    sqlDB, err := db.DB()
    if err != nil {
        return nil, err
    }

    sqlDB.SetMaxIdleConns(10)           // Максимум idle соединений
    sqlDB.SetMaxOpenConns(100)          // Максимум открытых соединений
    sqlDB.SetConnMaxLifetime(time.Hour) // Время жизни соединения

    return db, nil
}
```

### Кэширование

#### Redis конфигурация
```go
// cache/redis_cache.go
package cache

import (
    "context"
    "encoding/json"
    "time"

    "github.com/go-redis/cache/v8"
    "github.com/go-redis/redis/v8"
)

type Cache struct {
    client *redis.Client
    cache  *cache.Cache
}

func NewRedisCache() (*Cache, error) {
    client := redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "",
        DB:       0,
        PoolSize: 100,
    })

    cache := cache.New(&cache.Options{
        Redis:      client,
        LocalCache: cache.NewTinyLFU(1000, time.Minute),
    })

    return &Cache{client: client, cache: cache}, nil
}

func (c *Cache) Get(ctx context.Context, key string, dest interface{}) error {
    item := &cache.Item{
        Key:    key,
        Object: dest,
    }
    
    return c.cache.Get(ctx, key, dest)
}

func (c *Cache) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
    return c.cache.Set(&cache.Item{
        Key:        key,
        Value:      value,
        Expiration: expiration,
    })
}

func (c *Cache) Delete(ctx context.Context, key string) error {
    return c.client.Del(ctx, key).Err()
}

// Strategic cache implementation
func (c *Cache) CacheProject(projectID string, project *Project) error {
    key := fmt.Sprintf("project:%s", projectID)
    return c.Set(context.Background(), key, project, 30*time.Minute)
}

func (c *Cache) CacheProjectsList(page, limit int, projects []Project) error {
    key := fmt.Sprintf("projects:list:%d:%d", page, limit)
    return c.Set(context.Background(), key, projects, 5*time.Minute)
}

func (c *Cache) InvalidateProject(projectID string) error {
    keys := []string{
        fmt.Sprintf("project:%s", projectID),
        "projects:list", // Invalidate all list caches
    }
    
    return c.client.Del(context.Background(), keys...).Err()
}
```

#### Многоуровневое кэширование
```go
// cache/multi_level_cache.go
package cache

import (
    "sync"
    "time"
)

type CacheItem struct {
    Value     interface{}
    ExpireAt  time.Time
    HitCount  int
}

type MultiLevelCache struct {
    l1    map[string]*CacheItem
    l2    *RedisCache
    mutex sync.RWMutex
}

func NewMultiLevelCache(l2 *RedisCache) *MultiLevelCache {
    return &MultiLevelCache{
        l1: make(map[string]*CacheItem),
        l2: l2,
    }
}

func (mlc *MultiLevelCache) Get(key string) (interface{}, bool) {
    mlc.mutex.RLock()
    item, exists := mlc.l1[key]
    mlc.mutex.RUnlock()
    
    if exists {
        if time.Now().Before(item.ExpireAt) {
            item.HitCount++
            return item.Value, true
        } else {
            // Удаление просроченного элемента
            mlc.mutex.Lock()
            delete(mlc.l1, key)
            mlc.mutex.Unlock()
        }
    }
    
    // Попытка получить из L2 кэша
    if mlc.l2 != nil {
        var value interface{}
        err := mlc.l2.Get(context.Background(), key, &value)
        if err == nil {
            // Сохранение в L1 кэш
            mlc.mutex.Lock()
            mlc.l1[key] = &CacheItem{
                Value:    value,
                ExpireAt: time.Now().Add(5 * time.Minute),
            }
            mlc.mutex.Unlock()
            return value, true
        }
    }
    
    return nil, false
}
```

## Frontend оптимизация

### React оптимизации

#### Code splitting
```typescript
// router/AppRouter.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const ProjectList = lazy(() => import('../pages/ProjectList'));
const ProjectDashboard = lazy(() => import('../pages/ProjectDashboard'));
const EstimateEditor = lazy(() => import('../pages/EstimateEditor'));
const Finance = lazy(() => import('../pages/Finance'));
const CRM = lazy(() => import('../pages/CRM'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

export const AppRouter = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/:id" element={<ProjectDashboard />} />
        <Route path="/estimates" element={<EstimateEditor />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/crm" element={<CRM />} />
      </Routes>
    </Suspense>
  );
};
```

#### React.memo и оптимизация рендеринга
```typescript
// components/ProjectCard.tsx
import React, { memo, useCallback } from 'react';

interface ProjectCardProps {
  project: Project;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = memo(({ 
  project, 
  onEdit, 
  onDelete 
}) => {
  const handleEdit = useCallback(() => {
    onEdit(project.id);
  }, [project.id, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(project.id);
  }, [project.id, onDelete]);

  return (
    <div className="project-card bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {project.name}
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          project.status === 'in_progress' 
            ? 'bg-green-100 text-green-800'
            : project.status === 'planning'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {project.status}
        </span>
      </div>
      
      <p className="text-gray-600 mb-4">{project.address}</p>
      
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          Создан: {new Date(project.created_at).toLocaleDateString()}
        </span>
        <div className="flex space-x-2">
          <button
            onClick={handleEdit}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
          >
            Редактировать
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
});
```

#### Оптимизация состояния
```typescript
// hooks/useOptimizedProjects.ts
import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { projectService } from '../services/projectService';

export const useOptimizedProjects = () => {
  const queryClient = useQueryClient();

  // Мемоизированный запрос с оптимизацией ключей
  const { 
    data: projects = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery(
    ['projects', 'optimized'],
    projectService.getProjects,
    {
      staleTime: 5 * 60 * 1000, // 5 минут
      cacheTime: 10 * 60 * 1000, // 10 минут
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error?.status === 404) return false;
        return failureCount < 3;
      },
    }
  );

  // Мемоизированная фильтрация
  const filteredProjects = useMemo(() => {
    return projects.filter(project => 
      project.status !== 'cancelled'
    );
  }, [projects]);

  // Мемоизированная группировка
  const projectsByStatus = useMemo(() => {
    return filteredProjects.reduce((acc, project) => {
      if (!acc[project.status]) {
        acc[project.status] = [];
      }
      acc[project.status].push(project);
      return acc;
    }, {} as Record<string, Project[]>);
  }, [filteredProjects]);

  // Мемоизированные действия
  const invalidateProjects = useCallback(() => {
    queryClient.invalidateQueries(['projects']);
  }, [queryClient]);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    await queryClient.setQueryData(['projects', 'optimized'], (old: Project[] = []) => {
      return old.map(project => 
        project.id === id ? { ...project, ...updates } : project
      );
    });
  }, [queryClient]);

  return {
    projects: filteredProjects,
    projectsByStatus,
    isLoading,
    error,
    refetch,
    invalidateProjects,
    updateProject,
  };
};
```

#### Оптимизация изображений
```typescript
// components/ImageOptimizer.tsx
import React, { useState, useCallback } from 'react';

interface ImageOptimizerProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
}

export const ImageOptimizer: React.FC<ImageOptimizerProps> = ({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && !hasError && (
        <img
          src={placeholder}
          alt="Loading..."
          className="w-full h-full object-cover"
        />
      )}
      
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};
```

### Bundle оптимизация

#### Vite конфигурация
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { splitVendorChunkPlugin } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin(),
  ],
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'ui': ['@headlessui/react', '@heroicons/react'],
          'charts': ['recharts'],
          
          // App chunks
          'auth': [
            './src/pages/Auth.tsx',
            './src/services/authService.ts',
            './src/contexts/AuthContext.tsx'
          ],
          'projects': [
            './src/pages/ProjectList.tsx',
            './src/pages/ProjectDashboard.tsx',
            './src/services/projectService.ts'
          ],
          'estimates': [
            './src/pages/EstimateEditor.tsx',
            './src/pages/EstimatesList.tsx',
            './src/services/estimateService.ts'
          ],
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
    ],
  },
});
```

## Очереди и асинхронная обработка

### Background jobs
```go
// queue/job_queue.go
package queue

import (
    "context"
    "encoding/json"
    "time"

    "github.com/go-redis/redis/v8"
    "github.com/google/uuid"
)

type Job struct {
    ID          string                 `json:"id"`
    Type        string                 `json:"type"`
    Payload     map[string]interface{} `json:"payload"`
    Retries     int                    `json:"retries"`
    MaxRetries  int                    `json:"max_retries"`
    CreatedAt   time.Time              `json:"created_at"`
    ScheduledAt time.Time              `json:"scheduled_at"`
}

type JobHandler func(ctx context.Context, job *Job) error

type JobQueue struct {
    redis  *redis.Client
    queues map[string]string
    jobs   map[string]JobHandler
}

func NewJobQueue(redis *redis.Client) *JobQueue {
    return &JobQueue{
        redis: redis,
        queues: map[string]string{
            "default": "jobs:default",
            "ai":      "jobs:ai",
            "reports": "jobs:reports",
        },
        jobs: make(map[string]JobHandler),
    }
}

func (q *JobQueue) RegisterHandler(jobType string, handler JobHandler) {
    q.jobs[jobType] = handler
}

func (q *JobQueue) Enqueue(jobType string, payload map[string]interface{}, queue string) (string, error) {
    job := &Job{
        ID:          uuid.New().String(),
        Type:        jobType,
        Payload:     payload,
        Retries:     0,
        MaxRetries:  3,
        CreatedAt:   time.Now(),
        ScheduledAt: time.Now(),
    }

    data, err := json.Marshal(job)
    if err != nil {
        return "", err
    }

    queueName := q.queues[queue]
    if queueName == "" {
        queueName = q.queues["default"]
    }

    err = q.redis.RPush(context.Background(), queueName, data).Err()
    return job.ID, err
}

func (q *JobQueue) StartWorker(queue string, workers int) {
    queueName := q.queues[queue]
    if queueName == "" {
        queueName = q.queues["default"]
    }

    for i := 0; i < workers; i++ {
        go q.worker(queueName)
    }
}

func (q *JobQueue) worker(queueName string) {
    ctx := context.Background()
    
    for {
        // Получение задачи с таймаутом
        result := q.redis.BRPop(0, ctx, queueName)
        if result.Err() != nil {
            continue
        }

        var job Job
        err := json.Unmarshal(result.Val()[1], &job)
        if err != nil {
            continue
        }

        // Выполнение задачи
        handler, exists := q.jobs[job.Type]
        if !exists {
            continue
        }

        jobCtx := context.WithValue(ctx, "job_id", job.ID)
        err = handler(jobCtx, &job)
        
        if err != nil {
            job.Retries++
            if job.Retries < job.MaxRetries {
                // Повторная постановка задачи с задержкой
                delay := time.Duration(job.Retries) * time.Minute
                job.ScheduledAt = time.Now().Add(delay)
                
                data, _ := json.Marshal(job)
                q.redis.ZAdd(ctx, "jobs:delayed", &redis.Z{
                    Score:  float64(job.ScheduledAt.Unix()),
                    Member: data,
                })
            }
        }
    }
}
```

### Планировщик задач
```go
// scheduler/scheduler.go
package scheduler

import (
    "context"
    "time"

    "github.com/go-redis/redis/v8"
    "github.com/google/uuid"
)

type ScheduledJob struct {
    ID         string                 `json:"id"`
    Type       string                 `json:"type"`
    Payload    map[string]interface{} `json:"payload"`
    RunAt      time.Time              `json:"run_at"`
    Recurring  string                 `json:"recurring"` // cron expression
    Enabled    bool                   `json:"enabled"`
    CreatedAt  time.Time              `json:"created_at"`
}

type Scheduler struct {
    redis   *redis.Client
    jobs    map[string]func(ctx context.Context, *ScheduledJob) error
    ticker  *time.Ticker
}

func NewScheduler(redis *redis.Client) *Scheduler {
    s := &Scheduler{
        redis: redis,
        jobs:  make(map[string]func(ctx context.Context, *ScheduledJob) error),
    }
    
    s.ticker = time.NewTicker(30 * time.Second)
    go s.processScheduledJobs()
    
    return s
}

func (s *Scheduler) Schedule(job *ScheduledJob) error {
    data, err := json.Marshal(job)
    if err != nil {
        return err
    }

    score := float64(job.RunAt.Unix())
    return s.redis.ZAdd(context.Background(), "scheduler:jobs", &redis.Z{
        Score:  score,
        Member: data,
    }).Err()
}

func (s *Scheduler) processScheduledJobs() {
    for range s.ticker.C {
        now := time.Now().Unix()
        
        // Получение задач для выполнения
        jobs, err := s.redis.ZRangeByScoreWithScores(context.Background(), 
            "scheduler:jobs", &redis.ZRangeBy{
                Min: "-inf",
                Max: string(now),
            }).Result()
        
        if err != nil {
            continue
        }

        for _, job := range jobs {
            var scheduledJob ScheduledJob
            if err := json.Unmarshal([]byte(job.Member.(string)), &scheduledJob); err != nil {
                continue
            }

            // Выполнение задачи
            if handler, exists := s.jobs[scheduledJob.Type]; exists {
                ctx := context.WithValue(context.Background(), "job_id", scheduledJob.ID)
                if err := handler(ctx, &scheduledJob); err == nil {
                    // Удаление выполненной задачи
                    s.redis.ZRem(context.Background(), "scheduler:jobs", job.Member)
                    
                    // Перепланирование для повторяющихся задач
                    if scheduledJob.Recurring != "" {
                        go s.rescheduleJob(&scheduledJob)
                    }
                }
            }
        }
    }
}
```

## Мониторинг и алертинг

### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Stroy Control Performance Dashboard",
    "panels": [
      {
        "title": "API Response Time Distribution",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P99"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(cache_hits_total[5m]) / rate(cache_requests_total[5m])",
            "legendFormat": "Hit Rate"
          }
        ]
      },
      {
        "title": "Database Connection Pool",
        "type": "graph",
        "targets": [
          {
            "expr": "database_connections_active",
            "legendFormat": "{{state}}"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes / 1024 / 1024",
            "legendFormat": "Memory (MB)"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "active_users",
            "legendFormat": "Active Users"
          }
        ]
      }
    ]
  }
}
```

## План выполнения

### Этап 1 (Недели 1-3): Базовая оптимизация
- [ ] Настройка мониторинга производительности
- [ ] Оптимизация конфигурации БД
- [ ] Базовая настройка кэширования
- [ ] Оптимизация React компонентов

### Этап 2 (Недели 4-6): Продвинутые оптимизации
- [ ] Многоуровневое кэширование
- [ ] Оптимизация API endpoints
- [ ] Code splitting и bundle оптимизация
- [ ] Background jobs система

### Этап 3 (Недели 7-9): Производительное тестирование
- [ ] Load testing с реальными данными
- [ ] Профилирование bottlenecks
- [ ] Оптимизация критических путей
- [ ] Настройка автоскейлинга

### Этап 4 (Недели 10-12): Финальная настройка
- [ ] Мониторинг production метрик
- [ ] Автоматическая оптимизация
- [ ] Disaster recovery testing
- [ ] Документирование оптимизаций

---

*План оптимизации производительности создан: 24.11.2024*
*Версия: 1.0*
*Следующий обзор: 01.12.2024*