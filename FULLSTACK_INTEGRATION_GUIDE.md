# Pactoria MVP - Fullstack Integration Guide

## Overview

This document outlines the fullstack integration between the React frontend and FastAPI backend, including all the improvements and fixes implemented to ensure seamless communication across development and production environments.

## Architecture Summary

- **Frontend**: React + TypeScript + Vite (Azure Static Web Apps)
- **Backend**: FastAPI + Python (Azure Container Apps)
- **Database**: SQLite/PostgreSQL with SQLAlchemy
- **Real-time**: WebSocket connections for live collaboration
- **AI Integration**: Groq API for contract generation

## Integration Components

### 1. Environment Configuration

#### Frontend Environment System
- **Location**: `/frontend/src/config/env.ts`
- **Features**:
  - Centralized environment variable management
  - Type-safe configuration with validation
  - Automatic WebSocket URL generation from API URL
  - Environment-specific defaults
  - Production safety checks

#### Environment Files
- `.env.development` - Local development settings
- `.env.production` - Production deployment settings
- `.env.local` - Local overrides (gitignored)

#### Key Environment Variables
```bash
# API Configuration
VITE_API_URL=https://pactoria-backend.ashyforest-7d7631da.eastus.azurecontainerapps.io/api/v1
VITE_ENVIRONMENT=production

# Feature Flags
VITE_DEBUG_API_CALLS=false
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_AI_FEATURES=true

# Error Handling
VITE_ERROR_RETRY_ATTEMPTS=3
VITE_ERROR_RETRY_DELAY=2000

# Security
VITE_TOKEN_STORAGE_KEY=pactoria-auth-token
```

### 2. API Service Layer

#### Enhanced API Client
- **Location**: `/frontend/src/services/api.ts`
- **Features**:
  - Environment-based URL configuration
  - Automatic retry logic with exponential backoff
  - Connection health monitoring
  - Centralized error handling
  - JWT token management
  - Request/response logging in development

#### Key Improvements
- **Retry Logic**: Automatically retries failed requests (3 attempts by default)
- **Health Monitoring**: Regular API health checks with status tracking
- **Token Management**: Secure token storage with backward compatibility
- **Error Standardization**: Consistent error handling across all endpoints

### 3. Authentication Integration

#### Frontend Auth Store
- **Location**: `/frontend/src/store/authStore.ts`
- **Features**:
  - JWT token validation and automatic refresh
  - Secure token storage with migration support
  - Connection status tracking
  - Enhanced error handling
  - Automatic logout on token expiration

#### Backend JWT Implementation
- **Location**: `/backend/app/api/v1/auth.py`
- **Features**:
  - Secure password hashing with bcrypt
  - JWT tokens with 24-hour expiration
  - Company-based user isolation
  - Comprehensive audit logging

#### Authentication Flow
1. User submits credentials
2. Backend validates and returns JWT token
3. Frontend stores token securely
4. Token included in all API requests
5. WebSocket connections authenticated with same token
6. Automatic token refresh before expiration

### 4. CORS Configuration

#### Backend CORS Setup
- **Location**: `/backend/app/main.py` and `/backend/app/core/config.py`
- **Features**:
  - Environment-specific origin configuration
  - Azure Static Web Apps support
  - Proper credential handling
  - Detailed header configuration

#### CORS Origins
```python
# Development
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
]

# Production
CORS_ORIGINS = [
    "https://pactoria-frontend.azurestaticapps.net",
    "https://gentle-field-0123456789.eastus.azurestaticapps.net",
    # Add actual Azure Static Web App domains
]
```

### 5. WebSocket Integration

#### Frontend WebSocket Service
- **Location**: `/frontend/src/services/websocketService.ts`
- **Features**:
  - JWT-based authentication
  - Automatic reconnection with exponential backoff
  - Message type subscription system
  - Connection health monitoring
  - Proper cleanup and resource management

#### Backend WebSocket Handler
- **Location**: `/backend/app/api/v1/websocket.py`
- **Features**:
  - JWT token validation for connections
  - Company-based message isolation
  - Real-time contract collaboration
  - Connection management and cleanup

#### WebSocket Usage
```typescript
import { websocketService } from '../services/websocketService';

// Connect with auth token
await websocketService.connect(authToken);

// Subscribe to contract updates
const unsubscribe = websocketService.subscribe('contract_update', (message) => {
  console.log('Contract updated:', message.data);
});

// Send message
websocketService.send({
  type: 'contract_edit',
  data: { contractId: '123', changes: {...} }
});
```

### 6. File Upload System

#### Frontend File Service
- **Location**: `/frontend/src/services/fileUploadService.ts`
- **Features**:
  - File validation (type, size, security)
  - Progress tracking with XMLHttpRequest
  - Multiple file support
  - Error handling and retry logic
  - Malicious file detection

#### Supported File Types
- PDF (.pdf)
- Word Documents (.docx, .doc)
- Text Files (.txt)

#### Upload Limits
- Maximum file size: 10MB
- Security scanning for suspicious files

### 7. Error Handling System

#### Centralized Error Handler
- **Location**: `/frontend/src/services/errorHandler.ts`
- **Features**:
  - Standardized error format
  - User-friendly error messages
  - Error frequency tracking
  - Automatic retry suggestions
  - Integration with monitoring systems

#### Error Categories
- **Network Errors**: Connection issues, timeouts
- **Authentication Errors**: Invalid tokens, expired sessions
- **Validation Errors**: Form input validation
- **API Errors**: Server responses (4xx, 5xx)

### 8. Integration Testing

#### Test Suite
- **Location**: `/frontend/src/services/integrationTest.ts`
- **Features**:
  - Environment configuration validation
  - API connectivity testing
  - CORS configuration verification
  - Authentication endpoint testing
  - WebSocket connectivity testing
  - File upload validation testing

#### Running Tests
```typescript
import { integrationTest } from '../services/integrationTest';

// Run full test suite
const results = await integrationTest.runFullTestSuite();
console.log('Test Results:', results);

// Quick connectivity check
const isConnected = await integrationTest.quickConnectivityTest();
```

## Deployment Configuration

### Azure Static Web Apps
The frontend is deployed to Azure Static Web Apps with automatic CI/CD from GitHub.

#### Environment Variables (Azure Portal)
```bash
VITE_API_URL=https://pactoria-backend.ashyforest-7d7631da.eastus.azurecontainerapps.io/api/v1
VITE_ENVIRONMENT=production
VITE_DEBUG_API_CALLS=false
```

### Azure Container Apps
The backend is deployed to Azure Container Apps with environment-based configuration.

#### Environment Variables (Container Apps)
```bash
ENVIRONMENT=production
SECRET_KEY=<secure-secret-key>
JWT_SECRET_KEY=<secure-jwt-key>
GROQ_API_KEY=<groq-api-key>
CORS_ORIGINS=https://your-static-web-app.azurestaticapps.net
```

## Development Workflow

### Local Development
1. Start backend: `cd backend && python -m uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Frontend automatically proxies API requests to `localhost:8000`

### Production Testing
1. Set `VITE_API_URL` to production backend URL
2. Build frontend: `npm run build`
3. Test with production API

### Debugging

#### Frontend Debug Mode
Enable detailed API logging:
```bash
VITE_DEBUG_API_CALLS=true
```

#### Backend Debug Mode
Enable detailed logging:
```bash
DEBUG=true
LOG_LEVEL=DEBUG
```

## Security Considerations

### Token Security
- JWT tokens stored in localStorage with secure key
- Automatic token validation and cleanup
- Token expiration handling

### CORS Security
- Specific origin configuration (no wildcards with credentials)
- Proper header validation
- Credential handling

### File Upload Security
- File type validation
- Size limits
- Malicious file detection
- Server-side validation

## Monitoring and Observability

### Error Tracking
- Centralized error handling with context
- Error frequency monitoring
- User-friendly error messages

### Performance Monitoring
- API response time tracking
- Connection health monitoring
- WebSocket connection statistics

### Logging
- Structured logging in development
- Error reporting in production
- Audit trail for user actions

## Troubleshooting

### Common Issues

#### CORS Errors
- Verify `CORS_ORIGINS` includes your frontend domain
- Check that credentials are properly configured
- Ensure HTTPS in production

#### Authentication Issues
- Verify JWT secret keys match between environments
- Check token expiration times
- Validate token format and structure

#### WebSocket Connection Issues
- Ensure WebSocket URL is correctly generated
- Verify JWT token is valid for WebSocket auth
- Check firewall/proxy settings

#### File Upload Issues
- Verify file size limits
- Check allowed file types
- Ensure proper CORS headers for file endpoints

### Debug Commands

#### Frontend
```bash
# Check environment configuration
console.log(env.getConfig());

# Test API connectivity
import { integrationTest } from './services/integrationTest';
await integrationTest.quickConnectivityTest();

# Check authentication status
import { useAuthStore } from './store/authStore';
useAuthStore.getState().checkAuthStatus();
```

#### Backend
```bash
# Check health endpoint
curl https://your-backend.azurecontainerapps.io/health

# Test CORS
curl -H "Origin: https://your-frontend.azurestaticapps.net" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Authorization" \
     -X OPTIONS https://your-backend.azurecontainerapps.io/api/v1/health
```

## Next Steps

### Production Deployment
1. Update Azure Static Web App environment variables
2. Configure proper CORS origins in backend
3. Set up monitoring and alerting
4. Test full authentication flow
5. Verify WebSocket connectivity

### Performance Optimization
1. Implement Redis caching for API responses
2. Add request/response compression
3. Optimize bundle size and loading
4. Implement service worker for offline support

### Security Enhancements
1. Add rate limiting
2. Implement CSRF protection
3. Add security headers
4. Set up SSL/TLS certificates

This integration provides a robust, scalable foundation for the Pactoria MVP with proper error handling, security, and monitoring capabilities.