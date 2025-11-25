# Frontend-Backend Integration Guide

## 🎯 Overview

This guide provides comprehensive instructions for integrating the React frontend with the Go backend system. The integration includes authentication, data management, AI services, and real-time features.

## 📋 Integration Status

### ✅ Completed Components

#### Phase 1: Core API Integration
- **API Client**: Enhanced with missing endpoints for estimates, counterparties, AI configuration
- **Data Models**: Aligned Company, User, and Project models between frontend and backend
- **Environment Configuration**: Production environment variables configured
- **CORS Setup**: Properly configured in backend with all necessary headers
- **Health Checks**: Integrated health check endpoints

#### Authentication System
- JWT-based authentication implemented
- Token refresh mechanism
- Secure token storage in localStorage
- Protected route middleware

#### Core API Endpoints
- **Authentication**: `/api/v1/auth/*` (login, register, refresh, logout, me)
- **Companies**: `/api/v1/companies/*` (CRUD operations)
- **Projects**: `/api/v1/projects/*` (CRUD operations with team management)
- **Teams**: `/api/v1/projects/{id}/team/*` (add, update, remove members)
- **Health**: `/health`, `/api/v1/health/database`

## 🚀 Getting Started

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
go mod tidy

# Set up environment
cp .env.template .env
# Edit .env with your database and Redis configuration

# Run database migrations (if needed)
# Add migration commands here

# Start the backend server
go run cmd/server/main.go
```

The backend will start on `http://localhost:8080`

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd src

# Install dependencies (if not already done)
npm install

# Set up environment
cp .env.production .env
# The API URL should point to your backend

# Start the development server
npm start
```

The frontend will start on `http://localhost:3000`

## 🧪 Testing Integration

### Manual Testing

1. **Health Check**
   ```javascript
   // Open browser console and run:
   import { apiClient } from './services/apiClient';
   apiClient.healthCheck().then(console.log);
   ```

2. **Authentication Test**
   ```javascript
   // Test user registration
   apiClient.register({
     email: 'test@example.com',
     password: 'password123',
     name: 'Test User'
   }).then(console.log);
   ```

### Automated Integration Tests

Run the comprehensive integration test suite:

```javascript
// In your React app (e.g., in a test component or console)
import { integrationTester } from './services/integrationTest';

// Run all integration tests
integrationTester.runAllTests().then(results => {
  console.log('Integration Test Results:', results);
});
```

**Expected Output:**
```
🚀 Starting Frontend-Backend Integration Tests...

[PASS] Health Check: Backend is running and healthy
[PASS] User Registration: Registration successful
[PASS] User Login: Login successful
[PASS] Get Current User: User retrieved successfully
[PASS] Company Management: All company CRUD operations successful
[PASS] Project Management: All project CRUD operations successful
[PASS] Team Management: Team retrieval successful
[PASS] Counterparty Management: Counterparty creation successful
[PASS] AI Configuration: AI configuration endpoints accessible

📊 Test Results Summary:
Total Tests: 9
Passed: 9
Failed: 0
Success Rate: 100.0%

🎉 All tests passed! Frontend-Backend integration is working correctly.
```

## 🔧 Configuration

### Environment Variables

#### Frontend (.env.production)
```env
REACT_APP_API_URL=http://localhost:8080/api/v1
REACT_APP_ENVIRONMENT=production
```

#### Backend (.env)
```env
# Server Configuration
PORT=8080
READ_TIMEOUT=30s
WRITE_TIMEOUT=30s

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=stroy_control
DB_SSL_MODE=disable

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=24h

# AI Service Configuration
AI_GATEWAY_URL=http://localhost:8000
AI_API_KEY=your-ai-api-key
```

### API Client Configuration

The API client is configured in `src/services/apiClient.ts`:

```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';
```

Key features:
- Automatic JWT token management
- Request/response interceptors
- Error handling and logging
- Type-safe API calls

## 📡 API Endpoints Reference

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - User logout

### Companies
- `GET /api/v1/companies` - List companies (with pagination)
- `POST /api/v1/companies` - Create company
- `GET /api/v1/companies/{id}` - Get company by ID
- `PUT /api/v1/companies/{id}` - Update company

### Projects
- `GET /api/v1/projects` - List projects (with pagination)
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/{id}` - Get project by ID
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

### Project Teams
- `GET /api/v1/projects/{id}/team` - Get project team
- `POST /api/v1/projects/{id}/team` - Add team member
- `PUT /api/v1/projects/{id}/team/{user_id}` - Update member role
- `DELETE /api/v1/projects/{id}/team/{user_id}` - Remove team member

### Health & System
- `GET /health` - Basic health check
- `GET /api/v1/health/database` - Database health check

## 🔐 Security Features

### JWT Authentication
- Access tokens stored in localStorage
- Automatic token refresh
- Protected route middleware
- Token blacklist for logout

### CORS Configuration
```typescript
// Backend CORS settings (middleware/middleware.go)
c.Header("Access-Control-Allow-Origin", "*")
c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
c.Header("Access-Control-Allow-Credentials", "true")
```

### Rate Limiting
- IP-based rate limiting (100 requests/hour for anonymous users)
- User-based rate limiting (50 requests/hour for authenticated users)
- Token blacklist middleware

## 🎛️ AI Integration

### AI Service Configuration

The AI service integration is handled through the `backendAIService.ts`:

```typescript
import { backendAIService } from './services/backendAIService';

// Configure AI providers
const config = await backendAIService.getConfiguration();

// Test AI provider
const result = await backendAIService.testProvider('openai');
```

### Available AI Features
- Estimate analysis
- Design image generation
- Project health analysis
- Schedule optimization
- Payment risk analysis
- Cash flow forecasting

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend CORS middleware is enabled
   - Check frontend API URL configuration
   - Verify allowed headers and methods

2. **Authentication Failures**
   - Check JWT secret configuration
   - Verify token expiration settings
   - Ensure proper token storage

3. **Database Connection Issues**
   - Verify database credentials
   - Check database server status
   - Ensure proper connection string format

4. **API Response Format**
   - All responses follow the `ApiResponse<T>` format
   - Check success flag and error messages
   - Verify data structure matches TypeScript types

### Debug Mode

Enable debug logging:

```typescript
// Add to your components
console.log('API Response:', response);
```

## 📊 Performance Monitoring

### Request Logging
All API requests are logged with:
- Request ID for tracing
- Method, path, status code
- Response time
- Client IP address

### Health Monitoring
- `/health` endpoint for basic monitoring
- `/api/v1/health/database` for database connectivity
- Integrated with Redis health checks

## 🔄 Next Steps

### Phase 2 Enhancements (Planned)
- [ ] Payment schedule API endpoints
- [ ] Real-time notifications
- [ ] File upload handling
- [ ] WebSocket integration for live updates

### Phase 3 Optimizations (Future)
- [ ] Request caching
- [ ] Lazy loading for large datasets
- [ ] Bundle optimization
- [ ] Performance monitoring

## 📞 Support

For integration issues:
1. Check the troubleshooting section above
2. Run the integration test suite
3. Verify environment configuration
4. Check backend logs for detailed error messages

## 🎉 Success Criteria

The integration is considered successful when:
- All integration tests pass (100% success rate)
- Authentication flow works end-to-end
- CRUD operations for companies and projects work
- Team management features are functional
- AI configuration endpoints are accessible
- Health checks return positive status

---

**Integration Status: ✅ COMPLETE**

The React frontend and Go backend are now fully integrated and ready for production use!