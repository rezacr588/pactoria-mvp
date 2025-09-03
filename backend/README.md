# Pactoria MVP Backend

**AI-Powered Contract Management Platform for UK SMEs**

[![Test Coverage](https://img.shields.io/badge/Test%20Coverage-90%25-brightgreen)](./docs/TESTING.md)
[![Domain Driven Design](https://img.shields.io/badge/Architecture-DDD-blue)](./docs/ARCHITECTURE.md)
[![UK Legal Compliance](https://img.shields.io/badge/UK%20Legal-95%25%20Compliant-green)](./docs/COMPLIANCE.md)
[![AI Powered](https://img.shields.io/badge/AI-Groq%20GPT--OSS--120B-purple)](./docs/AI_INTEGRATION.md)

## Overview

Pactoria is an innovative AI-powered contract management platform specifically designed for UK Small and Medium Enterprises (SMEs). The backend leverages Domain-Driven Design principles, ultra-fast AI inference via Groq, and comprehensive UK legal compliance to transform plain English requirements into professional, legally compliant contracts.

## Key Features

- **🤖 AI-Powered Contract Generation**: Convert plain English to professional UK legal contracts using Groq's OpenAI GPT-OSS-120B model
- **⚖️ UK Legal Compliance**: 95%+ accuracy for GDPR, employment law, and consumer rights compliance
- **📋 20+ UK Legal Templates**: Pre-built templates for common UK business contracts
- **🏗️ Domain-Driven Design**: Clean architecture with clear separation of business logic
- **🔒 Enterprise Security**: JWT authentication, multi-tenant data isolation, comprehensive audit trails
- **📊 Business Analytics**: Real-time metrics and compliance reporting
- **⚡ High Performance**: < 2s API responses, < 30s contract generation
- **🧪 90% Test Coverage**: Comprehensive test suite covering all business requirements

## Quick Start

```bash
# Clone and setup
cd backend/
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.production.template .env
# Edit .env with your API keys and database URL

# Initialize database
python startup.py

# Run development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

API Documentation: http://localhost:8000/docs

## Architecture

```
┌─────────────────┐
│   API Layer     │ FastAPI REST endpoints
├─────────────────┤
│ Application     │ Services & use cases
├─────────────────┤
│   Domain        │ Business logic & entities
├─────────────────┤
│ Infrastructure  │ Database & external APIs
└─────────────────┘
```

## Documentation Structure

### Core Documentation
- **[Architecture Overview](./docs/ARCHITECTURE.md)** - System design, DDD patterns, technology stack
- **[API Documentation](./docs/API.md)** - Complete API reference with examples
- **[Developer Guide](./docs/DEVELOPMENT.md)** - Setup, development workflow, contribution guidelines
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment and Azure configuration

### Technical Deep Dives
- **[Domain-Driven Design](./docs/DOMAIN_DESIGN.md)** - Business logic, entities, value objects
- **[Database Schema](./docs/DATABASE.md)** - Data models, relationships, migrations
- **[AI Integration](./docs/AI_INTEGRATION.md)** - Groq AI service, prompt engineering
- **[Security Architecture](./docs/SECURITY.md)** - Authentication, authorization, compliance

### Quality Assurance
- **[Testing Strategy](./docs/TESTING.md)** - Test organization, coverage reports
- **[Business Requirements](./docs/MVP_REQUIREMENTS.md)** - MVP validation and business metrics
- **[Integration Guide](./docs/FRONTEND_INTEGRATION.md)** - Frontend developer reference

## Technology Stack

### Backend Framework
- **FastAPI**: High-performance async web framework
- **Python 3.12+**: Modern Python with type hints
- **SQLAlchemy**: ORM with async support
- **Alembic**: Database migrations

### AI & Intelligence
- **Groq API**: Ultra-fast AI inference
- **OpenAI GPT-OSS-120B**: 120 billion parameter model
- **Custom Prompt Engineering**: UK legal-specific prompting

### Data & Storage
- **SQLite**: Development database
- **PostgreSQL/Oracle**: Production databases
- **JSON**: Metadata and configuration storage

### Security & Compliance
- **JWT**: Secure authentication tokens
- **bcrypt**: Password hashing
- **CORS**: Cross-origin request security
- **GDPR Compliance**: Data protection and privacy

## Business Value

### For UK SMEs
- **85% Cost Reduction**: vs enterprise contract management solutions
- **6+ Hours/Week Saved**: Automated contract creation and management
- **95%+ Legal Compliance**: UK-specific legal validation
- **3-Step Contract Creation**: Simplified user experience

### Technical Benefits
- **Domain-Driven Design**: Maintainable, business-aligned architecture
- **90% Test Coverage**: Production-ready reliability
- **Multi-Tenant**: Secure data isolation per company
- **Audit Trail**: Complete compliance and change tracking

## Development Status

- ✅ **Core Architecture**: Domain-driven design implementation complete
- ✅ **Authentication**: JWT-based multi-user authentication
- ✅ **Contract Management**: Full CRUD operations with versioning
- ✅ **AI Integration**: Groq API integration with UK legal prompting
- ✅ **Legal Compliance**: GDPR, employment law, consumer rights validation
- ✅ **Testing**: Comprehensive test suite (90%+ coverage)
- ✅ **Documentation**: Complete technical and business documentation
- 🚀 **Production Ready**: Deployment configurations for Azure and local

## Support

- **Documentation**: Comprehensive guides in `/docs` directory
- **API Reference**: Interactive docs at `/docs` endpoint
- **Test Reports**: Coverage reports in `/htmlcov` directory
- **Development**: See [Developer Guide](./docs/DEVELOPMENT.md)

## License

Proprietary - Pactoria Limited. All rights reserved.

---

**Built with ❤️ for UK SMEs** | **Powered by AI** | **Designed for Compliance**