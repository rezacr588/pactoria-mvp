# 🔐 Environment Setup Guide

## Quick Start for Developers

### Backend Environment Setup

1. **Copy the environment template:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Add your GROQ API key:**
   ```bash
   # Edit backend/.env and set:
   GROQ_API_KEY=your_actual_groq_api_key_here
   GROQ_MODEL=groq/compound
   ```

3. **Required Environment Variables:**
   ```env
   # Security (generate secure random keys)
   SECRET_KEY=your_32_character_secret_key
   JWT_SECRET_KEY=your_32_character_jwt_secret
   
   # AI Service
   GROQ_API_KEY=gsk_your_actual_groq_api_key_here
   GROQ_MODEL=groq/compound
   
   # Database (auto-created)
   DATABASE_URL=sqlite:///./pactoria_mvp.db
   ```

### Frontend Environment Setup

1. **Copy the environment template:**
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. **Set API endpoint:**
   ```env
   VITE_API_URL=http://localhost:8000/api/v1
   ```

## 🛡️ Security Notes

- **Never commit .env files** - they contain sensitive API keys
- **Never share API keys** in chat, email, or documentation
- **Use GitHub Secrets** for production deployments
- **Rotate API keys** regularly

## 🚀 Start Development

```bash
# Backend (Terminal 1)
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (Terminal 2)  
cd frontend
npm run dev
```

Visit: http://localhost:5173 (Frontend) and http://localhost:8000/docs (API Documentation)

## 🔑 Getting GROQ API Key

1. Visit [console.groq.com](https://console.groq.com)
2. Sign up/login to your account
3. Go to API Keys section
4. Create a new API key
5. Copy and add to your `.env` file

**Current Model:** `groq/compound` (optimized for legal contract generation)