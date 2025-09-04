# Frontend → Production Backend Setup Guide

This guide shows how to run your **local frontend** against the **production backend** for testing and development.

## Quick Start

### 1. Check Backend Status
```bash
npm run check-backend
```

### 2. Switch to Production Backend Mode
```bash
# Option A: Use the environment switcher
npm run switch-env prod-backend
npm run dev

# Option B: Use direct mode
npm run dev:prod-backend
```

### 3. Your Frontend Will Now Connect To
- **Frontend**: `http://localhost:5173` (running locally)
- **Backend**: `https://pactoria-backend-new.ashyforest-7d7631da.eastus.azurecontainerapps.io/api/v1` (production)

---

## Available Environments

| Environment | Frontend | Backend | Use Case |
|-------------|----------|---------|----------|
| `local` | Local | Local | Full local development |
| `prod-backend` | Local | Production | Frontend testing with live data |
| `production` | Production | Production | Full production deployment |

---

## Backend Status & Cold Starts

### Azure Container Apps Behavior
The production backend runs on Azure Container Apps (free tier), which may:
- **Scale to zero** when idle to save costs
- **Take 30-60 seconds** to respond on first request (cold start)
- **Respond normally** after being warmed up

### Handling Cold Starts
If the backend seems unresponsive:
1. **Wait 60-90 seconds** for cold start
2. **Try the API again** - it should respond normally
3. **Check with browser**: Visit the health endpoint directly: `https://pactoria-backend-new.ashyforest-7d7631da.eastus.azurecontainerapps.io/api/v1/health`

---

## Environment Files

### `.env.prod-backend` (Local Frontend → Production Backend)
```env
VITE_API_URL=https://pactoria-backend-new.ashyforest-7d7631da.eastus.azurecontainerapps.io/api/v1
VITE_ENVIRONMENT=development
VITE_DEBUG_API_CALLS=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_TEMPLATES=true
```

### `.env.local` (Local Frontend → Local Backend)  
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_ENVIRONMENT=development
VITE_DEBUG_API_CALLS=true
```

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start with current `.env` settings |
| `npm run dev:prod-backend` | Start with production backend (bypasses `.env`) |
| `npm run check-backend` | Test both local and production backend connectivity |
| `npm run switch-env local` | Switch to local backend mode |
| `npm run switch-env prod-backend` | Switch to production backend mode |
| `npm run switch-env production` | Switch to full production mode |

---

## Authentication & CORS

### Authentication
- Uses **JWT Bearer tokens** stored in localStorage
- **Same authentication flow** for both local and production backends
- Tokens are **environment-specific** (login required when switching)

### CORS Configuration
Production backend includes CORS headers for:
- `http://localhost:5173` (your local frontend)
- `http://localhost:3000` (alternative local port)
- `https://your-production-frontend.com` (your deployed frontend)

---

## Troubleshooting

### Backend Not Responding
1. **Cold Start**: Wait 60-90 seconds and retry
2. **Check Health**: Visit health endpoint in browser
3. **Check Logs**: Contact backend team for Azure Container Apps logs

### Authentication Issues
1. **Clear Storage**: Delete localStorage auth data and re-login
2. **Check Tokens**: JWT tokens may have expired
3. **CORS Errors**: Check browser dev console for CORS issues

### API Call Debugging
Enable debug mode to see all API calls:
```bash
# Debug calls are enabled by default in prod-backend mode
npm run dev:prod-backend
```

Check browser console for detailed API request/response logs.

---

## Benefits of This Setup

### For Frontend Development
✅ **Live Data**: Test with real production data  
✅ **Fast Iteration**: Hot reload for frontend changes  
✅ **API Validation**: Ensure compatibility with production API  
✅ **User Testing**: Test user flows with actual data  

### For Testing
✅ **Integration Testing**: Full end-to-end testing  
✅ **Performance Testing**: Real API response times  
✅ **CORS Testing**: Validate cross-origin requests  
✅ **Authentication Testing**: Test auth flows with production backend  

---

## Switching Back to Local Development

When ready to return to full local development:

```bash
npm run switch-env local
npm run dev
```

Make sure your local backend is running on port 8000 before switching.

---

## Production Deployment

When ready to deploy frontend to production:

```bash
npm run switch-env production
npm run build:prod
```

The `dist/` folder will contain your production-ready frontend files.