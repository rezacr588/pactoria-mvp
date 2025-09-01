# Frontend Development Setup Guide

This guide explains how to set up and run the Pactoria MVP frontend with full backend integration.

## Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8000` (or configured URL)

## Environment Configuration

1. **Copy the environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Configure environment variables:**
   ```env
   # API Configuration
   VITE_API_URL=http://localhost:8000/api/v1
   
   # Application Configuration
   VITE_APP_NAME=Pactoria
   VITE_APP_VERSION=1.0.0
   VITE_NODE_ENV=development
   
   # Feature Flags
   VITE_ENABLE_ANALYTICS=true
   VITE_ENABLE_AI_FEATURES=true
   VITE_ENABLE_TEMPLATES=true
   VITE_ENABLE_DEBUG=false
   
   # Debug Settings (for development)
   VITE_DEBUG_API_CALLS=true
   VITE_DEBUG_ERRORS=true
   
   # UI Configuration
   VITE_DEFAULT_PAGE_SIZE=10
   VITE_MAX_PAGE_SIZE=100
   
   # Polling and Refresh Intervals (in milliseconds)
   VITE_POLLING_INTERVAL=30000
   VITE_CACHE_DURATION=300000
   
   # Error Handling
   VITE_ERROR_RETRY_ATTEMPTS=3
   VITE_ERROR_RETRY_DELAY=1000
   
   # Security
   VITE_TOKEN_STORAGE_KEY=auth-token
   VITE_ENABLE_HTTPS_ONLY=false
   ```

## Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Frontend: `http://localhost:5173`
   - Ensure backend is running on `http://localhost:8000`

## API Integration Overview

The frontend integrates with the backend using:

### Authentication
- JWT token-based authentication
- Token stored securely in localStorage
- Automatic token refresh handling
- Login/Register forms integrated with `/auth/` endpoints

### Contract Management
- Full CRUD operations via `/contracts/` endpoints
- AI content generation via `/contracts/{id}/generate`
- Compliance analysis via `/contracts/{id}/analyze`
- Template integration via `/contracts/templates/`
- Real-time pagination and filtering

### Analytics Dashboard
- Business metrics from `/analytics/business`
- Dashboard data from `/analytics/dashboard`
- Time series data from `/analytics/time-series/{metric}`
- Real-time updates and trend analysis

## Project Structure

```
src/
├── services/
│   └── api.ts              # Centralized API service layer
├── store/
│   ├── authStore.ts        # Authentication state management
│   ├── contractStore.ts    # Contract management state
│   └── analyticsStore.ts   # Analytics data state
├── types/
│   └── index.ts           # TypeScript interfaces matching backend schemas
├── utils/
│   ├── errorHandling.ts   # API error handling utilities
│   └── loadingStates.ts   # Loading state management utilities
└── pages/
    ├── LoginPage.tsx      # Integrated auth with backend
    ├── ContractsPage.tsx  # Real-time contract management
    └── AnalyticsPage.tsx  # Live analytics dashboard
```

## Key Integration Features

### API Service Layer (`src/services/api.ts`)
- **AuthService**: Login, register, profile management
- **ContractService**: CRUD, generation, compliance analysis
- **AnalyticsService**: Dashboard, metrics, time series data
- Automatic error handling and retry logic
- Debug logging for development
- Type-safe API responses

### State Management
- **Zustand stores** for each domain (auth, contracts, analytics)
- Real-time data synchronization
- Optimistic updates with error recovery
- Proper loading states and error boundaries

### Error Handling
- User-friendly error messages
- Network error detection and retry
- Authentication error handling
- Validation error display
- Toast notifications for user feedback

## Development Features

### Debug Mode
When `VITE_DEBUG_API_CALLS=true`:
- All API requests/responses logged to console
- Error details displayed in development
- Network timing information
- Request/response payload inspection

### Hot Module Replacement
- Instant updates during development
- State preservation across code changes
- Error overlay for quick debugging

### Type Safety
- Full TypeScript integration
- Backend schema matching
- Compile-time error detection
- IntelliSense support for API responses

## Testing the Integration

### Manual Testing Checklist

1. **Authentication Flow:**
   - [ ] Register new user creates account via API
   - [ ] Login with valid credentials works
   - [ ] Invalid credentials show appropriate error
   - [ ] Token refresh works automatically
   - [ ] Logout clears all state

2. **Contract Management:**
   - [ ] List contracts loads from API
   - [ ] Search and filtering work server-side
   - [ ] Create new contract saves to backend
   - [ ] Edit contract updates via API
   - [ ] Delete contract removes from backend
   - [ ] AI generation calls backend service
   - [ ] Compliance analysis integrates properly

3. **Analytics Dashboard:**
   - [ ] Dashboard loads real metrics from API
   - [ ] Charts display actual data
   - [ ] Time series data updates correctly
   - [ ] Refresh functionality works

4. **Error Scenarios:**
   - [ ] Network errors show user-friendly messages
   - [ ] API errors display appropriate feedback
   - [ ] Retry mechanisms work for failed requests
   - [ ] Loading states display during API calls

## Common Issues & Solutions

### Backend Connection Issues
```bash
# Check if backend is running
curl http://localhost:8000/api/v1/health

# Check CORS configuration if seeing CORS errors
# Ensure backend allows http://localhost:5173
```

### Authentication Issues
```bash
# Clear stored tokens if having auth issues
localStorage.clear()

# Check token format in developer tools
# Should be JWT format: eyJ...
```

### API Response Issues
- Enable `VITE_DEBUG_API_CALLS=true` to inspect requests/responses
- Check Network tab in browser developer tools
- Verify backend API responses match expected schema

## Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables for Production

```env
VITE_API_URL=https://your-api-domain.com/api/v1
VITE_NODE_ENV=production
VITE_ENABLE_DEBUG=false
VITE_DEBUG_API_CALLS=false
VITE_ENABLE_HTTPS_ONLY=true
```

## Support

For development issues:
1. Check browser console for errors
2. Enable debug mode for detailed logging
3. Verify backend API is running and accessible
4. Check network requests in browser dev tools