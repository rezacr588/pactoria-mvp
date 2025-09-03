# Architecture Overview

**Pactoria MVP Backend - Domain-Driven Design Architecture**

## Table of Contents

1. [System Overview](#system-overview)
2. [Architectural Principles](#architectural-principles)
3. [Layer Architecture](#layer-architecture)
4. [Domain-Driven Design Implementation](#domain-driven-design-implementation)
5. [Technology Stack](#technology-stack)
6. [System Components](#system-components)
7. [Data Flow](#data-flow)
8. [Scalability Considerations](#scalability-considerations)

---

## System Overview

Pactoria's backend architecture follows **Domain-Driven Design (DDD)** principles with clean architecture patterns, specifically engineered for AI-powered contract management targeting UK SMEs.

### Core Architectural Goals

- **Business-Centric Design**: Architecture reflects real-world contract management business processes
- **AI Integration**: Seamless integration with Groq's ultra-fast inference capabilities
- **UK Legal Compliance**: Built-in support for UK legal requirements (GDPR, employment law, consumer rights)
- **Multi-Tenancy**: Secure data isolation for multiple companies
- **High Performance**: Sub-2-second API responses, sub-30-second contract generation
- **Test-Driven Quality**: 90%+ test coverage across all layers

---

## Architectural Principles

### Domain-Driven Design (DDD)

```
Ubiquitous Language: Contract, Agreement, Template, Compliance, Risk Assessment
Bounded Context: Contract Management Domain
Aggregates: Contract (root), User, Company, Template
Value Objects: Money, DateRange, ComplianceScore, ContractParty
Domain Services: ContractGenerationService, ComplianceAnalysisService
```

### Clean Architecture Patterns

```
Dependencies point inward toward the domain
External concerns (database, AI services) are abstracted
Business rules are independent of frameworks and UI
Testable in isolation without external dependencies
```

### SOLID Principles

- **S**ingle Responsibility: Each class has one reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Derived classes must be substitutable for base classes
- **I**nterface Segregation: Clients shouldn't depend on unused interface methods
- **D**ependency Inversion: Depend on abstractions, not concretions

---

## Layer Architecture

The system follows a four-layer architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   REST API      │  │  Authentication │  │   OpenAPI   │ │
│  │   Endpoints     │  │   & Security    │  │    Docs     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Application Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Application    │  │   Command       │  │    Query    │ │
│  │   Services      │  │   Handlers      │  │  Handlers   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Domain Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │    Entities     │  │  Value Objects  │  │   Domain    │ │
│  │  & Aggregates   │  │  & Invariants   │  │  Services   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Infrastructure Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Database      │  │  External APIs  │  │   Message   │ │
│  │  Repositories   │  │  (Groq AI)      │  │    Queue    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### API Layer (`app/api/`)
- **REST Endpoints**: HTTP request/response handling
- **Authentication**: JWT token validation and user context
- **Validation**: Input validation using Pydantic schemas
- **Error Handling**: HTTP error responses and exception handling
- **Documentation**: OpenAPI/Swagger documentation generation

#### Application Layer (`app/application/`)
- **Use Cases**: Business workflow orchestration
- **Commands & Queries**: CQRS pattern implementation
- **Transaction Management**: Database transaction boundaries
- **External Integration**: Coordination with AI services and external APIs
- **Event Publishing**: Domain event handling and publishing

#### Domain Layer (`app/domain/`)
- **Business Logic**: Core contract management rules and invariants
- **Entities**: Contract, User, Company domain objects
- **Value Objects**: Money, DateRange, ComplianceScore immutable objects
- **Domain Services**: Complex business operations spanning multiple entities
- **Repository Interfaces**: Data persistence abstractions

#### Infrastructure Layer (`app/infrastructure/`)
- **Data Persistence**: SQLAlchemy ORM models and repositories
- **External Services**: Groq AI service integration
- **Configuration**: Environment-based configuration management
- **Security**: Cryptographic operations and secure storage

---

## Domain-Driven Design Implementation

### Bounded Context: Contract Management

The system operates within a single bounded context focused on contract management for UK SMEs.

#### Ubiquitous Language

```python
# Core business concepts used throughout the system
Contract: A legal agreement between parties
Template: Pre-built UK legal contract structure
Compliance: Adherence to UK legal requirements (GDPR, employment law, etc.)
Generation: AI-powered contract content creation
Risk Assessment: Legal risk evaluation (1-10 scale)
Audit Trail: Complete change history for compliance
Multi-Tenancy: Company-based data isolation
```

### Aggregate Design

#### Contract Aggregate Root

```python
class Contract(AggregateRoot[ContractId]):
    """
    Contract aggregate root managing the complete contract lifecycle
    
    Invariants:
    - Contract must have valid title and type
    - Only draft contracts can be modified
    - Active contracts require final content
    - Status transitions follow defined workflow
    - Version increments on content changes
    """
    
    # Core Properties
    contract_id: ContractId
    title: str
    contract_type: ContractType
    status: ContractStatus
    
    # Business Data
    client: ContractParty
    supplier: Optional[ContractParty]
    contract_value: Optional[Money]
    date_range: Optional[DateRange]
    
    # Content Management
    plain_english_input: str
    generated_content: Optional[str]
    final_content: Optional[str]
    
    # Compliance & Risk
    compliance_score: Optional[ComplianceScore]
    risk_assessment: Optional[RiskAssessment]
    
    # Business Operations
    def activate(self, user_id: str) -> None
    def complete(self, user_id: str, reason: str) -> None
    def terminate(self, user_id: str, reason: str) -> None
    def set_generated_content(self, content: str, metadata: dict) -> None
```

### Value Objects

```python
@dataclass(frozen=True)
class Money:
    """UK currency value object with business rules"""
    amount: Decimal
    currency: str = "GBP"
    
    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")

@dataclass(frozen=True)
class ComplianceScore:
    """UK legal compliance assessment"""
    overall_score: float  # 0.0-1.0
    gdpr_compliance: Optional[float]
    employment_law_compliance: Optional[float]
    consumer_rights_compliance: Optional[float]
    
    @property
    def is_compliant(self) -> bool:
        return self.overall_score >= 0.95
```

### Domain Services

```python
class ContractGenerationDomainService:
    """
    Domain service for complex contract generation business logic
    spanning multiple aggregates and external services
    """
    
    def can_generate_contract(self, contract: Contract) -> bool:
        """Business rules for contract generation eligibility"""
        
    def prepare_generation_context(self, contract: Contract, 
                                 templates: List[Template]) -> GenerationContext:
        """Prepare comprehensive context for AI generation"""
```

---

## Technology Stack

### Core Framework
```python
# Web Framework
FastAPI: High-performance async web framework with automatic OpenAPI docs
Pydantic: Data validation and serialization with type hints
SQLAlchemy: Async ORM with advanced query capabilities
Alembic: Database migration management

# Authentication & Security
JWT: Stateless authentication tokens
bcrypt: Secure password hashing
CORS: Cross-origin request handling
```

### AI & Intelligence
```python
# AI Integration
Groq API: Ultra-fast AI inference (sub-second response times)
OpenAI GPT-OSS-120B: 120 billion parameter mixture-of-experts model
Custom Prompting: UK legal-specific prompt engineering
```

### Data & Storage
```python
# Database Support
SQLite: Development and testing
PostgreSQL: Production (Azure/AWS)
Oracle: Enterprise production option
JSON: Metadata and configuration storage
```

### Development & Testing
```python
# Testing Framework
pytest: Comprehensive testing with fixtures and async support
pytest-asyncio: Async test support
Factory Pattern: Test data generation
Mock Integration: External service mocking

# Development Tools
uvicorn: ASGI server with hot reload
Black: Code formatting
mypy: Type checking
Coverage: Test coverage reporting
```

---

## System Components

### API Endpoints Structure

```
/api/v1/
├── auth/              # Authentication & user management
│   ├── register       # User registration with company
│   ├── login          # JWT token authentication
│   └── profile        # User profile management
├── contracts/         # Contract lifecycle management
│   ├── /              # CRUD operations
│   ├── /{id}/generate # AI content generation
│   ├── /{id}/analyze  # Compliance analysis
│   └── templates/     # Template management
├── analytics/         # Business intelligence
│   ├── business       # Company metrics
│   ├── compliance     # Compliance reporting
│   └── performance    # System performance
└── security/          # Security & audit
    ├── events         # Security event monitoring
    ├── audit-logs     # Comprehensive audit trail
    └── gdpr/          # GDPR compliance endpoints
```

### Application Services

```python
# Core Application Services
ContractApplicationService: Contract lifecycle management
AIServiceApplicationService: AI integration coordination
AnalyticsApplicationService: Business intelligence
SecurityApplicationService: Audit and compliance
UserApplicationService: Authentication and user management
```

### External Integrations

```python
# AI Services
GroqAIService: Contract generation and analysis
ComplianceValidationService: UK legal validation

# Infrastructure Services
EmailService: Notification system
CalendarService: Deadline management
ExportService: Document generation (PDF, CSV)
AuditService: Comprehensive audit trail
```

---

## Data Flow

### Contract Creation Flow

```
1. User Request (API Layer)
   ↓
2. Authentication & Validation (API Layer)
   ↓
3. Command Processing (Application Layer)
   ↓
4. Domain Logic Execution (Domain Layer)
   ↓
5. Event Publishing (Domain Layer)
   ↓
6. Data Persistence (Infrastructure Layer)
   ↓
7. Response Generation (API Layer)
```

### AI Generation Flow

```
1. Generation Request (API Layer)
   ↓
2. Business Rule Validation (Domain Layer)
   ↓
3. Context Preparation (Application Layer)
   ↓
4. AI Service Call (Infrastructure Layer)
   ↓
5. Response Processing (Domain Layer)
   ↓
6. Content Storage (Infrastructure Layer)
   ↓
7. Audit Log Creation (Infrastructure Layer)
```

### Compliance Analysis Flow

```
1. Analysis Request (API Layer)
   ↓
2. Content Validation (Domain Layer)
   ↓
3. UK Legal Rule Application (Domain Service)
   ↓
4. AI Compliance Check (Infrastructure Layer)
   ↓
5. Score Calculation (Domain Layer)
   ↓
6. Risk Assessment (Domain Service)
   ↓
7. Results Storage (Infrastructure Layer)
```

---

## Scalability Considerations

### Horizontal Scaling

```python
# Stateless Design
- JWT-based authentication (no server-side sessions)
- Read replicas for query-heavy operations
- Event-driven architecture for async processing
- Microservice-ready domain boundaries

# Caching Strategy
- Application-level caching for templates
- Database query result caching
- AI response caching for repeated analyses
- CDN for static content delivery
```

### Performance Optimization

```python
# Database Optimization
- Proper indexing on frequently queried fields
- Connection pooling with configurable limits
- Lazy loading for related entities
- Batch processing for bulk operations

# AI Service Optimization
- Request batching where possible
- Response caching for similar inputs
- Fallback mechanisms for service failures
- Monitoring and alerting for performance degradation
```

### Monitoring & Observability

```python
# Metrics Collection
- Request/response timing
- Database query performance
- AI service response times
- Error rates by endpoint

# Health Monitoring
- Database connectivity checks
- AI service availability
- System resource utilization
- Business metric tracking
```

### Future Architecture Evolution

```python
# Microservice Transition
- Domain boundaries are service boundaries
- Event-driven communication between services
- Shared data through events, not databases
- Independent deployment and scaling

# Advanced Features
- Event sourcing for audit requirements
- CQRS with separate read/write models
- Saga pattern for distributed transactions
- GraphQL API for flexible data fetching
```

---

This architecture provides a solid foundation for Pactoria's contract management platform, ensuring maintainability, scalability, and business alignment while delivering the AI-powered features that differentiate it in the UK SME market.