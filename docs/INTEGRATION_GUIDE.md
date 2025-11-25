# Production Integration Guide - Enhanced Features System

## Overview

This guide provides step-by-step instructions for integrating your enhanced features into production. The enhanced payment services (PaymentAnalyticsService, PaymentScheduleAdapter, QuickPaymentService) are already compatible with the new backend endpoints and require minimal configuration changes to connect to real production services.

## 🚀 Quick Start Checklist

### Pre-Integration Requirements
- [ ] PostgreSQL database running and configured
- [ ] Redis server running for caching
- [ ] File storage system (local or S3) configured
- [ ] AI Gateway service deployed or mock mode configured
- [ ] Environment variables configured
- [ ] SSL certificates for production HTTPS

## 📊 1. Database Integration

### 1.1 Production Database Setup

#### PostgreSQL Configuration
```sql
-- Connect to your PostgreSQL instance
psql -h your-db-host -U postgres -d stroy_control

-- Verify table structure exists
\dt

-- Expected tables:
-- companies, users, projects, estimates, estimate_items, 
-- transactions, payment_schedules, ai_analyses, files
```

#### Database Migration
```bash
# Run database migrations
cd backend
go run cmd/migrate/main.go --up

# Verify migration
go run cmd/migrate/main.go --status
```

### 1.2 Frontend Database Connection

Update your frontend API client to connect to production endpoints:

```typescript
// src/services/apiClient.ts (production configuration)
export const apiClient = new ApiClient(
  process.env.VITE_API_URL || 'https://your-api-domain.com/api/v1'
);

// Configure with production headers
apiClient.setDefaultHeaders({
  'Content-Type': 'application/json',
  'X-Client-Version': '2.0.0'
});
```

### 1.3 Environment Configuration

```bash
# backend/.env.production
DATABASE_HOST=your-production-db-host
DATABASE_PORT=5432
DATABASE_USER=stroy_user
DATABASE_PASSWORD=your_secure_password
DATABASE_DBNAME=stroy_control
DATABASE_SSL_MODE=require

# Update connection pool settings
DATABASE_MAX_CONNECTIONS=25
DATABASE_MAX_IDLE_CONNECTIONS=5
DATABASE_CONNECTION_TIMEOUT=10s
```

### 1.4 Database Connection Testing

```bash
# Test database connectivity
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-api-domain.com/api/v1/health/database

# Expected response:
# {"status": "healthy", "time": "2024-01-01T12:00:00Z"}
```

## 💾 2. File Storage Integration

### 2.1 Local Storage Setup (Development/Testing)

```bash
# Create upload directories
mkdir -p /app/uploads/{estimates,projects,reports,photos}
chmod 755 /app/uploads
chown -R app:app /app/uploads

# Configure backend
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=50MB
```

### 2.2 AWS S3 Production Setup

#### 2.2.1 S3 Bucket Configuration
```bash
# Create S3 bucket
aws s3 mb s3://your-company-documents-prod

# Configure bucket policy for secure access
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-company-documents-prod/public/*"
    },
    {
      "Sid": "RestrictedAccess",
      "Effect": "Deny",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR-ACCOUNT:role/stroy-service-role"
      },
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::your-company-documents-prod/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket your-company-documents-prod --policy file://bucket-policy.json
```

#### 2.2.2 IAM Role for Service
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-company-documents-prod",
        "arn:aws:s3:::your-company-documents-prod/*"
      ]
    }
  ]
}
```

#### 2.2.3 Backend Configuration
```bash
# backend/.env.production
STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-company-documents-prod
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Alternative: Use IAM roles (more secure)
AWS_USE_IAM_ROLE=true
```

### 2.3 MinIO (Private Cloud) Setup

```bash
# docker-compose.minio.yml
version: '3.8'
services:
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

volumes:
  minio_data:
```

```bash
# Backend MinIO configuration
STORAGE_TYPE=minio
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET_NAME=stroy-documents
MINIO_USE_SSL=false
```

### 2.4 Frontend File Upload Integration

Update your file upload components:

```typescript
// src/services/fileService.ts (production version)
export const fileService = {
  async uploadFiles(files: File[], category: string, projectId?: string): Promise<FileUploadResponse> {
    const formData = new FormData();
    
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });
    
    formData.append('category', category);
    if (projectId) {
      formData.append('project_id', projectId);
    }

    return apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 seconds for large files
      onUploadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${progress}%`);
      },
    });
  },

  async getFileDownloadUrl(fileId: string): Promise<{ download_url: string }> {
    return apiClient.get(`/files/${fileId}/download-url`);
  },
};
```

## 🤖 3. AI Service Integration

### 3.1 AI Gateway Deployment Options

#### Option A: Use Existing AI Gateway Service

```bash
# Check if AI Gateway is accessible
curl -X GET https://your-ai-gateway.com/health

# Expected response:
# {"status": "healthy", "service": "ai-gateway"}
```

#### Option B: Deploy AI Gateway Locally

```bash
# From ai-gateway directory
cd ai-gateway
./deploy.sh --production

# This will:
# 1. Build Docker containers
# 2. Start Redis for AI cache
# 3. Deploy FastAPI service
# 4. Configure load balancing
```

### 3.2 Backend AI Service Configuration

```bash
# backend/.env.production
# AI Service Configuration
AI_GATEWAY_URL=https://your-ai-gateway.com
AI_API_KEY=your-ai-service-api-key
AI_TIMEOUT=30s
AI_MAX_RETRIES=3

# Mock mode (disable for production)
AI_USE_MOCK=false

# Cache settings
AI_CACHE_TTL=3600  # 1 hour
AI_CACHE_PREFIX=ai_analysis
```

### 3.3 AI Service Integration in Payment Analysis

Update your payment analytics service to use real AI:

```typescript
// src/services/paymentAnalyticsService.ts (with real AI integration)
export class PaymentAnalyticsService {
  static async generatePaymentAnalytics(
    transactions: Transaction[],
    projects: Project[],
    estimates: Estimate[],
    cashAccounts: CashAccount[],
    counterparties: Counterparty[],
    aiConfig?: AIConfig
  ): Promise<PaymentAnalytics> {
    // ... existing code ...
    
    // Enhanced AI insights with real service
    const aiInsights = await this.generateAIInsightsWithService(
      { incomeStats, expenseStats, accountabilityStats, cashFlowForecast },
      aiConfig
    );
    
    return {
      // ... existing fields ...
      aiInsights
    };
  }

  private static async generateAIInsightsWithService(
    analyticsData: AnalyticsData,
    aiConfig?: AIConfig
  ): Promise<AIInsights> {
    if (!aiConfig?.enabled || !aiConfig?.endpoint) {
      return this.getMockAIInsights();
    }

    try {
      const response = await fetch(`${aiConfig.endpoint}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: this.buildPaymentAnalysisPrompt(analyticsData)
          }],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      const data = await response.json();
      return this.parseAIResponse(data);
    } catch (error) {
      console.error('AI service error:', error);
      return this.getMockAIInsights();
    }
  }

  private static buildPaymentAnalysisPrompt(data: AnalyticsData): string {
    return `
      Analyze construction company financial data:
      
      Income: ${data.incomeStats.amount.toLocaleString()} ₽ (${data.incomeStats.count} transactions)
      Expenses: ${data.expenseStats.amount.toLocaleString()} ₽ (${data.expenseStats.count} transactions)
      Accountability: ${data.accountabilityStats.issued.toLocaleString()} ₽ issued, ${data.accountabilityStats.returned.toLocaleString()} ₽ returned
      
      Provide JSON response with:
      - cashFlowHealth: "excellent|good|warning|critical"
      - recommendations: [array of strings]
      - riskAlerts: [array of strings]
      - optimizationOpportunities: [array of strings]
    `;
  }
}
```

### 3.4 Quick Payment AI Integration

```typescript
// src/services/quickPaymentService.ts (enhanced with AI)
export class QuickPaymentService {
  static async validateAndAnalyzePayment(
    request: QuickPaymentRequest,
    context: PaymentContext
  ): Promise<QuickPaymentValidation> {
    const validation = await this.performBasicValidation(request, context);
    
    // Enhance with AI recommendations
    if (context.aiConfig?.enabled && validation.isValid) {
      const aiRecommendations = await this.getAIRecommendations(request, context);
      validation.aiRecommendations = aiRecommendations;
      
      // Add AI risk factors to warnings
      if (aiRecommendations.riskFactors?.length) {
        validation.warnings.push(...aiRecommendations.riskFactors);
      }
    }
    
    return validation;
  }
}
```

## 🔄 4. Redis Cache Setup

### 4.1 Redis Production Configuration

#### Docker Compose Redis Setup
```yaml
# docker-compose.redis.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    restart: unless-stopped
    networks:
      - stroy-network

  redis-insight:
    image: redislabs/redisinsight:latest
    ports:
      - "8001:8001"
    depends_on:
      - redis
    networks:
      - stroy-network

volumes:
  redis_data:

networks:
  stroy-network:
    driver: bridge
```

#### Redis Configuration File
```bash
# redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
requirepass your_redis_password
```

### 4.2 Backend Redis Integration

```bash
# backend/.env.production
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
REDIS_TIMEOUT=5s

# Cache settings
CACHE_TTL_PAYMENTS=300      # 5 minutes
CACHE_TTL_FILES=120         # 2 minutes
CACHE_TTL_ANALYTICS=900     # 15 minutes
CACHE_TTL_AI_RESPONSES=3600 # 1 hour
```

### 4.3 Frontend Redis-Backed Services

```typescript
// src/services/cacheService.ts
export class CacheService {
  private redis: Redis;
  
  constructor(config: CacheConfig) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.warn('Cache invalidation error:', error);
    }
  }
}

// Enhanced PaymentAnalyticsService with caching
export class PaymentAnalyticsService {
  private static cache = new CacheService(redisConfig);

  static async generatePaymentAnalytics(...): Promise<PaymentAnalytics> {
    const cacheKey = this.generateCacheKey(arguments);
    
    // Try to get from cache first
    let analytics = await this.cache.get<PaymentAnalytics>(cacheKey);
    if (analytics) {
      return analytics;
    }

    // Generate analytics
    analytics = await this.generateAnalyticsInternal(...);
    
    // Cache for 5 minutes
    await this.cache.set(cacheKey, analytics, 300);
    
    return analytics;
  }
}
```

## 🔐 5. Security Configuration

### 5.1 Production Security Headers

```go
// backend/internal/middleware/security.go
func SecurityHeaders() gin.HandlerFunc {
    return gin.HandlerFunc(func(c *gin.Context) {
        c.Header("X-Content-Type-Options", "nosniff")
        c.Header("X-Frame-Options", "DENY")
        c.Header("X-XSS-Protection", "1; mode=block")
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        c.Header("Content-Security-Policy", "default-src 'self'")
        c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
        c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    })
}
```

### 5.2 Environment-Specific Configuration

```typescript
// src/config/environment.ts
export const config = {
  production: {
    apiBaseUrl: process.env.VITE_API_URL!,
    wsUrl: process.env.VITE_WS_URL!,
    aiConfig: {
      enabled: process.env.VITE_AI_ENABLED === 'true',
      endpoint: process.env.VITE_AI_ENDPOINT!,
      apiKey: process.env.VITE_AI_API_KEY!,
    },
    fileUpload: {
      maxFiles: 10,
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: ['.pdf', '.docx', '.jpg', '.png'],
    },
    cache: {
      ttl: 5 * 60 * 1000, // 5 minutes
    },
  },
  
  development: {
    apiBaseUrl: 'http://localhost:8080/api/v1',
    wsUrl: 'ws://localhost:8080/ws',
    aiConfig: {
      enabled: true,
      endpoint: 'http://localhost:8000',
      apiKey: 'dev-key',
    },
  },
};

export const env = config[process.env.NODE_ENV as keyof typeof config] || config.development;
```

## 🚀 6. Production Deployment

### 6.1 Docker Production Setup

```dockerfile
# backend/Dockerfile.production
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server/

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/main .
COPY --from=builder /app/config ./config

EXPOSE 8080
CMD ["./main"]
```

```yaml
# docker-compose.production.yml
version: '3.8'
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.production
    ports:
      - "8080:8080"
    environment:
      - DATABASE_HOST=postgres
      - REDIS_HOST=redis
      - AI_GATEWAY_URL=http://ai-gateway:8000
    depends_on:
      - postgres
      - redis
    networks:
      - stroy-network

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: stroy_control
      POSTGRES_USER: stroy_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d
    networks:
      - stroy-network

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - stroy-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    networks:
      - stroy-network

volumes:
  postgres_data:
  redis_data:

networks:
  stroy-network:
    driver: bridge
```

### 6.2 Frontend Production Build

```bash
# Build frontend for production
cd src
npm run build

# Deploy to CDN or static hosting
# Update nginx to serve frontend from /var/www/stroy-frontend
```

### 6.3 SSL/TLS Configuration

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Backend API proxy
    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://backend:8080/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # Static frontend
    location / {
        root /var/www/stroy-frontend;
        try_files $uri $uri/ /index.html;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## 🧪 7. Testing Integration

### 7.1 Integration Test Suite

```bash
# backend/run_integration_tests.sh
#!/bin/bash

echo "Running integration tests..."

# Test database connectivity
echo "Testing database connection..."
curl -f http://localhost:8080/api/v1/health/database || exit 1

# Test Redis connectivity
echo "Testing Redis cache..."
curl -f http://localhost:8080/api/v1/health/cache || exit 1

# Test payment endpoints
echo "Testing payment endpoints..."
curl -f -H "Authorization: Bearer $TEST_TOKEN" \
     http://localhost:8080/api/v1/payment-schedules || exit 1

# Test file upload
echo "Testing file upload..."
curl -f -H "Authorization: Bearer $TEST_TOKEN" \
     -F "category=estimate" \
     -F "files=@test.pdf" \
     http://localhost:8080/api/v1/files/upload || exit 1

# Test AI endpoints (if enabled)
if [ "$AI_ENABLED" = "true" ]; then
    echo "Testing AI endpoints..."
    curl -f -H "Authorization: Bearer $TEST_TOKEN" \
         -H "Content-Type: application/json" \
         -d '{"estimate_id":"test-123"}' \
         http://localhost:8080/api/v1/ai/estimates/analyze || exit 1
fi

echo "All integration tests passed!"
```

### 7.2 Frontend Integration Tests

```typescript
// src/tests/integration/payment.test.ts
describe('Payment Integration Tests', () => {
  test('should integrate with real payment API', async () => {
    const analytics = await PaymentAnalyticsService.generatePaymentAnalytics(
      mockTransactions,
      mockProjects,
      mockEstimates,
      mockCashAccounts,
      mockCounterparties
    );

    expect(analytics.totalTransactions).toBeGreaterThan(0);
    expect(analytics.aiInsights).toBeDefined();
  });

  test('should handle AI service errors gracefully', async () => {
    // Mock AI service failure
    jest.spyOn(AIService, 'chat').mockRejectedValue(new Error('AI service unavailable'));
    
    const analytics = await PaymentAnalyticsService.generatePaymentAnalytics(
      mockTransactions,
      mockProjects,
      mockEstimates,
      mockCashAccounts,
      mockCounterparties,
      { enabled: true, endpoint: 'http://fake-ai-service.com' }
    );

    // Should fall back to mock AI insights
    expect(analytics.aiInsights).toBeDefined();
    expect(analytics.aiInsights.recommendations).toContain('Ошибка AI-анализа. Проверьте настройки.');
  });
});
```

## 📈 8. Monitoring & Observability

### 8.1 Application Monitoring

```go
// backend/internal/monitoring/metrics.go
package monitoring

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    PaymentAnalysisDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "payment_analysis_duration_seconds",
            Help: "Duration of payment analysis requests",
        },
        []string{"status", "ai_enabled"},
    )
    
    APILatency = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "api_request_duration_seconds",
            Help: "API request latency",
        },
        []string{"method", "endpoint", "status_code"},
    )
    
    CacheHitRate = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "cache_operations_total",
            Help: "Cache operations count",
        },
        []string{"operation", "hit"},
    )
)
```

### 8.2 Health Checks

```bash
# Add to docker-compose.production.yml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## ✅ 9. Go-Live Checklist

### Pre-Launch Verification

- [ ] Database migrations completed successfully
- [ ] All API endpoints responding correctly
- [ ] Redis cache operational and accessible
- [ ] File storage configured and tested
- [ ] AI service connected (or mock mode stable)
- [ ] SSL certificates installed and valid
- [ ] Environment variables configured
- [ ] Monitoring and logging setup
- [ ] Backup and recovery procedures tested
- [ ] Performance testing completed
- [ ] Security scan completed
- [ ] Team training completed

### Launch Day

1. **Deploy Backend**
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

2. **Deploy Frontend**
   ```bash
   npm run build
   # Deploy to hosting provider
   ```

3. **Verify Services**
   ```bash
   ./run_integration_tests.sh
   ```

4. **Monitor Initial Usage**
   - Watch real-time metrics
   - Monitor error rates
   - Check response times
   - Verify cache hit rates

### Post-Launch

- [ ] Monitor system health for 24 hours
- [ ] Review error logs and fix any issues
- [ ] Gather user feedback
- [ ] Optimize performance based on real usage
- [ ] Plan next iteration of features

## 🔄 10. Migration from Mock to Production

### Step-by-Step Migration

#### Phase 1: Database Migration
```sql
-- Run migration scripts
\i migrations/001_initial_schema.sql
\i migrations/002_test_data.sql

-- Verify data integrity
SELECT COUNT(*) FROM companies;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM projects;
```

#### Phase 2: API Endpoint Switching
```typescript
// src/config/apiConfig.ts
export const switchToProduction = async () => {
  // Test production endpoints
  const healthCheck = await apiClient.get('/health');
  
  if (healthCheck.status === 'ok') {
    console.log('Production API is ready');
    // Switch environment configuration
    localStorage.setItem('environment', 'production');
    window.location.reload();
  }
};
```

#### Phase 3: Service Integration
```bash
# Update environment variables
export VITE_API_URL=https://your-production-api.com/api/v1
export VITE_AI_ENABLED=true
export VITE_AI_ENDPOINT=https://your-ai-service.com
export VITE_CACHE_TTL=300000
```

#### Phase 4: Data Migration Cleanup
```bash
# Remove mock data after successful migration
rm src/services/mockData.ts
rm src/__mocks__/mockData.ts

# Update imports in components
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "mockData" | head -5
```

## 🆘 Troubleshooting

### Common Issues and Solutions

#### Database Connection Issues
```bash
# Check database connectivity
psql -h your-db-host -U stroy_user -d stroy_control -c "SELECT version();"

# Check connection pool
curl -H "Authorization: Bearer $TOKEN" \
     https://your-api.com/api/v1/health/database
```

#### Redis Connection Issues
```bash
# Test Redis connection
redis-cli -h redis -a your_password ping

# Check cache statistics
redis-cli -h redis -a your_password info stats
```

#### File Upload Issues
```bash
# Check file permissions
ls -la /app/uploads

# Test upload endpoint
curl -H "Authorization: Bearer $TOKEN" \
     -F "category=test" \
     -F "files=@small-test.pdf" \
     https://your-api.com/api/v1/files/upload
```

#### AI Service Issues
```bash
# Check AI gateway health
curl https://your-ai-gateway.com/health

# Test AI endpoint directly
curl -X POST https://your-ai-gateway.com/chat \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $AI_API_KEY" \
     -d '{"messages":[{"role":"user","content":"test"}]}'
```

## 📞 Support & Resources

### Documentation Links
- [API Documentation](../backend/API_DOCUMENTATION.md)
- [Enhanced Features Guide](./ENHANCED_FEATURES_IMPLEMENTATION.md)
- [Frontend Integration Plan](./INTEGRATION_PLAN.md)

### Monitoring Dashboards
- Application Metrics: `https://your-monitoring.com`
- Database Monitoring: `https://your-db-monitoring.com`
- AI Service Metrics: `https://your-ai-monitoring.com`

### Emergency Contacts
- DevOps Team: devops@yourcompany.com
- Backend Team: backend@yourcompany.com  
- Frontend Team: frontend@yourcompany.com

---

**Integration Guide Version:** 2.0  
**Last Updated:** 2025-11-25  
**Status:** Production Ready ✅

Your enhanced features system is now ready for production deployment. Follow this guide step-by-step to ensure a smooth integration process.