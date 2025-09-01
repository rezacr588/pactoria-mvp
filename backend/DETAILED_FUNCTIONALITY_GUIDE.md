# Pactoria MVP Backend - Detailed Functionality Guide

*Version: 0.1.0-mvp*  
*Generated: September 1, 2025*

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Business Functionalities](#core-business-functionalities)
3. [Domain Layer Functions](#domain-layer-functions)
4. [Application Services](#application-services)
5. [API Endpoints](#api-endpoints)
6. [AI Integration Features](#ai-integration-features)
7. [Authentication & Security](#authentication--security)
8. [Database Operations](#database-operations)
9. [Infrastructure Components](#infrastructure-components)
10. [Error Handling & Validation](#error-handling--validation)
11. [Monitoring & Analytics](#monitoring--analytics)

---

## Architecture Overview

Pactoria MVP backend follows **Domain-Driven Design (DDD)** principles with a clean architecture approach:

```
app/
├── api/v1/              # REST API endpoints
├── application/         # Application services & use cases
├── core/               # Core configuration & utilities
├── domain/             # Domain entities, value objects & business rules
├── infrastructure/     # Database models & repositories
├── schemas/           # Pydantic models for API contracts
└── services/          # External service integrations
```

### Key Design Patterns
- **Domain-Driven Design (DDD)**: Rich domain model with aggregates and value objects
- **Repository Pattern**: Abstract data access with domain-focused interfaces
- **Command/Query Separation**: Distinct commands for state changes
- **Event-Driven Architecture**: Domain events for cross-cutting concerns
- **Clean Architecture**: Dependencies point inward toward the domain

---

## Core Business Functionalities

### 1. Contract Lifecycle Management

**Purpose**: Complete lifecycle management for UK legal contracts from creation to termination.

**Business Value**: Enables SMEs to manage contracts efficiently with full audit trails and compliance tracking.

#### Contract Creation
```python
# Location: app/api/v1/contracts.py:create_contract()
# Domain: app/domain/entities/contract.py:Contract.create()

# Business Rules:
- User must be associated with a company
- Contract starts in DRAFT status
- Template validation (if specified)
- Full audit trail creation
- Automatic version control initialization
```

**API Endpoint**: `POST /api/v1/contracts/`

**Request Example**:
```json
{
  "title": "Professional Services Agreement - Acme Ltd",
  "contract_type": "service_agreement",
  "plain_english_input": "I need a contract for consulting services...",
  "client_name": "Acme Limited",
  "client_email": "contracts@acme.com",
  "contract_value": 15000.00,
  "currency": "GBP",
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-12-31T23:59:59Z"
}
```

#### Contract Status Transitions
```python
# Valid status transitions enforced at domain level
DRAFT → PENDING_REVIEW → ACTIVE → COMPLETED
       ↘ ACTIVE → EXPIRED
              ↘ TERMINATED
```

**Business Rules**:
- DRAFT: Can be edited, generated, analyzed
- ACTIVE: Cannot be edited (only final content updates)
- COMPLETED: Read-only, no modifications allowed
- TERMINATED: Soft delete, audit trail maintained

#### Contract Updates
```python
# Location: app/api/v1/contracts.py:update_contract()
# Domain: Contract entity enforces modification rules

# Business Rules:
- No updates to completed contracts
- Status transitions must be valid
- All changes create audit log entries
- Version increments on content changes
```

### 2. AI-Powered Contract Generation

**Purpose**: Generate legally compliant UK contracts from plain English input using Groq AI.

**Business Value**: Reduces contract drafting time from hours to minutes while ensuring legal compliance.

#### Contract Content Generation
```python
# Location: app/services/ai_service.py:generate_contract()
# Integration: Groq API with OpenAI GPT-OSS-120B model

# Process Flow:
1. Parse contract requirements from plain English
2. Build comprehensive AI prompt with UK legal context
3. Generate contract using Groq API
4. Validate and store generated content
5. Create AI generation metadata record
```

**AI Prompt Structure**:
```python
def _build_contract_prompt(self, request):
    """
    Comprehensive prompt for UK legal contract generation:
    - Contract type and requirements
    - UK legal compliance requirements
    - GDPR compliance clauses
    - Standard commercial terms
    - Dispute resolution clauses
    """
```

**API Endpoint**: `POST /api/v1/contracts/{contract_id}/generate`

**AI Metadata Tracking**:
- Model name and version
- Processing time (milliseconds)
- Token usage statistics
- Confidence scoring
- Generation parameters

### 3. Legal Compliance Analysis

**Purpose**: Automated compliance analysis for UK legal requirements including GDPR, employment law, and commercial terms.

**Business Value**: Ensures contracts meet legal standards, reducing legal risks for SMEs.

#### Compliance Scoring System
```python
# Location: app/services/ai_service.py:analyze_compliance()
# Scoring: 0.0 - 1.0 scale for each compliance area

Compliance Areas:
- Overall Score: Comprehensive legal compliance
- GDPR Compliance: Data protection requirements
- Employment Law: UK employment regulations  
- Consumer Rights: Consumer protection laws
- Commercial Terms: Standard commercial practices
```

**Risk Assessment**:
```python
# Risk scoring: 1-10 scale (1=low risk, 10=high risk)
class RiskAssessment:
    risk_score: int  # 1-10
    risk_factors: List[str]  # Specific risks identified
    recommendations: List[str]  # Improvement suggestions
    
    @property
    def risk_level(self) -> str:
        # "Low" (1-3), "Medium" (4-6), "High" (7-8), "Critical" (9-10)
```

**API Endpoint**: `POST /api/v1/contracts/{contract_id}/analyze`

### 4. Template Management System

**Purpose**: Pre-built UK legal templates for common contract types.

**Business Value**: Accelerates contract creation with legally vetted templates.

#### Available Template Categories
```python
# MVP includes 20+ core UK legal templates
Template Categories:
- Service Agreements (Professional, IT, Consulting)
- Employment Contracts (Full-time, Part-time, Contractor)
- Supplier Agreements (Vendor, Procurement)
- NDAs (Mutual, One-way)
- Terms & Conditions (Website, Service)
```

**Template Features**:
- GDPR compliance built-in
- UK jurisdiction specific
- Industry-specific variations
- Customizable clauses
- Compliance feature tracking

**API Endpoint**: `GET /api/v1/contracts/templates/`

---

## Domain Layer Functions

### Contract Aggregate Root

**Location**: `app/domain/entities/contract.py`

The Contract aggregate is the core business entity that encapsulates all contract-related business rules and invariants.

#### Core Properties
```python
class Contract(AggregateRoot[ContractId]):
    # Identity
    contract_id: ContractId
    
    # Essential Information
    title: str
    contract_type: ContractType
    status: ContractStatus
    plain_english_input: str
    
    # Parties
    client: ContractParty
    supplier: Optional[ContractParty]
    
    # Business Context
    created_by_user_id: str
    company_id: str
    
    # Optional Business Data
    contract_value: Optional[Money]
    date_range: Optional[DateRange]
    
    # Content Management
    generated_content: Optional[str]
    final_content: Optional[str]
    ai_metadata: Optional[Dict[str, Any]]
    
    # Compliance & Risk
    compliance_score: Optional[ComplianceScore]
    risk_assessment: Optional[RiskAssessment]
    
    # Version Control
    versions: List[ContractVersion]
```

#### Business Operations

**Contract Creation**
```python
@classmethod
def create(cls, contract_id, title, contract_type, plain_english_input, 
          client, supplier, created_by_user_id, company_id) -> 'Contract':
    """
    Factory method for contract creation with domain event
    
    Business Rules:
    - Validates all required fields
    - Initializes in DRAFT status
    - Raises ContractCreated domain event
    """
```

**Content Management**
```python
def set_generated_content(self, content: str, ai_metadata: Dict[str, Any]):
    """
    Set AI-generated content with validation
    
    Business Rules:
    - Content cannot be empty
    - Only allowed on non-completed contracts
    - Increments version
    - Raises ContractContentGenerated event
    """

def finalize_content(self, content: str, user_id: str):
    """
    Set final human-reviewed content
    
    Business Rules:
    - Final content overrides generated content
    - Creates audit trail
    - Version control
    """
```

**Lifecycle Management**
```python
def activate(self, user_id: str):
    """
    Activate contract for execution
    
    Business Rules:
    - Must be in DRAFT status
    - Must have final content
    - Cannot be expired
    - Raises ContractActivated event
    """

def complete(self, user_id: str, completion_reason: Optional[str]):
    """
    Mark contract as completed
    
    Business Rules:
    - Must be ACTIVE status
    - Becomes read-only
    - Raises ContractCompleted event
    """

def terminate(self, user_id: str, reason: str):
    """
    Terminate contract early
    
    Business Rules:
    - Must be ACTIVE or DRAFT
    - Termination reason required
    - Raises ContractTerminated event
    """
```

### Value Objects

**Location**: `app/domain/value_objects.py`

Value objects represent domain concepts that are defined by their values rather than identity.

#### Money Value Object
```python
@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str = "GBP"
    
    def __post_init__(self):
        # Validates positive amounts and supported currencies
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")
        if self.currency not in ["GBP", "EUR", "USD"]:
            raise ValueError(f"Unsupported currency: {self.currency}")
    
    def add(self, other: 'Money') -> 'Money':
        # Currency-aware arithmetic operations
```

#### Compliance Score Value Object
```python
@dataclass(frozen=True)
class ComplianceScore:
    overall_score: float  # 0.0 - 1.0
    gdpr_compliance: Optional[float]
    employment_law_compliance: Optional[float]
    consumer_rights_compliance: Optional[float]
    commercial_terms_compliance: Optional[float]
    
    @property
    def is_compliant(self) -> bool:
        return self.overall_score >= 0.8
    
    @property
    def compliance_level(self) -> str:
        # "Excellent" (0.95+), "Good" (0.85+), etc.
```

#### Contract Party Value Object
```python
@dataclass(frozen=True)
class ContractParty:
    name: str
    email: Optional[Email] = None
    company: Optional[str] = None
    role: str = "party"
    
    def __post_init__(self):
        # Validates party information
```

### Domain Events

Domain events capture important business occurrences for cross-cutting concerns.

```python
# Contract Lifecycle Events
ContractCreated: Raised on contract creation
ContractContentGenerated: Raised on AI generation
ContractActivated: Raised on contract activation
ContractCompleted: Raised on completion
ContractTerminated: Raised on termination

# Usage in Application Services
if self._event_publisher:
    await self._publish_domain_events(contract)
```

---

## Application Services

**Location**: `app/application/services/contract_application_service.py`

Application services orchestrate domain operations and coordinate between layers.

### ContractApplicationService

The main application service for contract operations following CQRS patterns.

#### Command Handling

**CreateContractCommand**
```python
@dataclass
class CreateContractCommand:
    title: str
    contract_type: ContractType
    plain_english_input: str
    client_name: str
    created_by_user_id: str
    company_id: str
    # Optional fields...

async def create_contract(self, command: CreateContractCommand) -> Contract:
    """
    Create new contract with full domain validation
    
    Process:
    1. Create domain objects (ContractId, ContractParty, etc.)
    2. Use factory method Contract.create()
    3. Set optional business data (value, dates)
    4. Save via repository
    5. Publish domain events
    """
```

**GenerateContractContentCommand**
```python
async def generate_contract_content(self, command: GenerateContractContentCommand) -> Contract:
    """
    Generate contract content using AI service
    
    Process:
    1. Load contract from repository
    2. Check regeneration business rules
    3. Prepare AI request with contract data
    4. Call AI service
    5. Set generated content on domain entity
    6. Save and publish events
    """
```

**AnalyzeComplianceCommand**
```python
async def analyze_compliance(self, command: AnalyzeComplianceCommand) -> Contract:
    """
    Analyze contract compliance
    
    Process:
    1. Load contract and validate content exists
    2. Check reanalysis business rules
    3. Call AI compliance service
    4. Create compliance value objects
    5. Set analysis on contract
    6. Save updated contract
    """
```

#### Query Operations

```python
async def get_contract_by_id(self, contract_id: ContractId) -> Contract:
    """Get contract with domain validation"""

async def get_contracts_by_company(self, company_id: str, 
                                 page: int = 1, size: int = 20) -> PageResult:
    """Paginated company contracts"""

async def search_contracts(self, filters: Dict[str, Any], 
                         page: int = 1, size: int = 20) -> PageResult:
    """Search with complex filters"""

async def get_expiring_contracts(self, company_id: str, 
                               days_ahead: int = 30) -> List[Contract]:
    """Business intelligence queries"""
```

#### Coordination Logic

The application service coordinates between:
- **Domain Layer**: Business logic and validation
- **Infrastructure Layer**: Data persistence
- **External Services**: AI service integration
- **Event Publishing**: Domain event handling

```python
def __init__(self, 
             contract_repository: ContractRepository,
             ai_service: Any,
             event_publisher: Optional[Any] = None):
    """Dependency injection for clean architecture"""
```

---

## API Endpoints

All API endpoints follow RESTful conventions with comprehensive OpenAPI documentation.

### Authentication Endpoints

**Base Path**: `/api/v1/auth`

#### User Registration
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@company.com",
  "full_name": "John Doe",
  "password": "securepassword123",
  "company_name": "Acme Ltd",
  "timezone": "Europe/London"
}
```

**Response**: 201 Created
```json
{
  "token": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "expires_in": 86400
  },
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@company.com",
    "full_name": "John Doe",
    "is_active": true,
    "company_id": "550e8400-e29b-41d4-a716-446655440001",
    "created_at": "2025-01-01T12:00:00Z"
  },
  "company": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Acme Ltd",
    "subscription_tier": "starter"
  }
}
```

**Business Logic**:
- Creates company with STARTER subscription (5 users max)
- Secure password hashing (bcrypt)
- Immediate JWT token generation
- Automatic user activation

#### User Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "securepassword123"
}
```

**Security Features**:
- Rate limiting protection
- Account lockout after failed attempts
- Last login timestamp tracking
- JWT token with configurable expiration

### Contract Management Endpoints

**Base Path**: `/api/v1/contracts`  
**Authentication**: Required (JWT Bearer token)

#### Create Contract
```http
POST /api/v1/contracts/
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "title": "Professional Services Agreement - Q1 2025",
  "contract_type": "service_agreement",
  "plain_english_input": "I need a contract for 3 months of consulting services...",
  "client_name": "Acme Limited",
  "client_email": "procurement@acme.com",
  "supplier_name": "My Consulting Ltd",
  "contract_value": 15000.00,
  "currency": "GBP",
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-03-31T23:59:59Z",
  "template_id": "template-service-001"
}
```

**Response**: 201 Created
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "title": "Professional Services Agreement - Q1 2025",
  "contract_type": "service_agreement",
  "status": "draft",
  "plain_english_input": "I need a contract for 3 months...",
  "client_name": "Acme Limited",
  "client_email": "procurement@acme.com",
  "contract_value": 15000.00,
  "currency": "GBP",
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-01T12:00:00Z",
  "version": 1,
  "is_current_version": true
}
```

#### Generate Contract Content
```http
POST /api/v1/contracts/{contract_id}/generate
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "regenerate": false
}
```

**Response**: 200 OK
```json
{
  "id": "ai-gen-550e8400-e29b-41d4-a716-446655440003",
  "model_name": "openai/gpt-oss-120b",
  "generated_content": "PROFESSIONAL SERVICES AGREEMENT\n\nThis Agreement is made...",
  "processing_time_ms": 2347.5,
  "token_usage": {
    "prompt_tokens": 245,
    "completion_tokens": 1823,
    "total_tokens": 2068
  },
  "confidence_score": 0.94,
  "created_at": "2025-01-01T12:05:30Z"
}
```

**Business Logic**:
- Checks for existing generation (unless regenerate=true)
- Validates contract state (must be modifiable)
- Builds comprehensive AI prompt
- Stores generation metadata
- Creates audit log entry

#### Analyze Contract Compliance
```http
POST /api/v1/contracts/{contract_id}/analyze
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "force_reanalysis": false
}
```

**Response**: 200 OK
```json
{
  "id": "compliance-550e8400-e29b-41d4-a716-446655440004",
  "contract_id": "550e8400-e29b-41d4-a716-446655440002",
  "overall_score": 0.94,
  "gdpr_compliance": 0.96,
  "employment_law_compliance": 0.91,
  "consumer_rights_compliance": 0.95,
  "commercial_terms_compliance": 0.93,
  "risk_score": 3,
  "risk_factors": [
    "Consider adding liability caps",
    "Clarify data retention periods"
  ],
  "recommendations": [
    "Add explicit GDPR data processing clauses",
    "Include standard UK termination notice requirements"
  ],
  "analysis_date": "2025-01-01T12:10:45Z"
}
```

#### List Contracts with Filtering
```http
GET /api/v1/contracts/?page=1&size=20&contract_type=service_agreement&status=active&search=Acme
Authorization: Bearer {jwt_token}
```

**Query Parameters**:
- `page`: Page number (default: 1)
- `size`: Page size (1-100, default: 10)
- `contract_type`: Filter by contract type
- `status`: Filter by status
- `search`: Text search in title, client, supplier

**Response**: 200 OK
```json
{
  "contracts": [...],
  "total": 45,
  "page": 1,
  "size": 20,
  "pages": 3
}
```

### AI Services Endpoints

**Base Path**: `/api/v1/ai`

#### Health Check
```http
GET /api/v1/ai/health
```

**Response**:
```json
{
  "status": "healthy",
  "model": "openai/gpt-oss-120b",
  "features": [
    "contract_generation",
    "compliance_validation",
    "risk_assessment",
    "template_recommendation"
  ],
  "response_time_ms": 45.2
}
```

#### Contract Analysis
```http
POST /api/v1/ai/analyze-contract
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "contract_content": "This Agreement is made between...",
  "contract_type": "service_agreement"
}
```

#### Template Recommendation
```http
POST /api/v1/ai/recommend-template
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "business_description": "I run a web development consultancy and need contracts for client projects"
}
```

**Response**:
```json
{
  "business_description": "I run a web development consultancy...",
  "recommended_templates": [
    {
      "template_id": "template-service-001",
      "name": "Professional Services Agreement",
      "confidence": 0.92,
      "description": "Standard UK professional services contract with GDPR compliance",
      "suitable_for": ["consulting", "professional services", "freelance work"]
    }
  ],
  "confidence": 0.92,
  "reasoning": "Based on business description mentioning web development and client projects"
}
```

### Security & Compliance Endpoints

**Base Path**: `/api/v1/security`

#### Get Security Events (Admin Only)
```http
GET /api/v1/security/events?hours=24&severity=high
Authorization: Bearer {admin_jwt_token}
```

#### GDPR Data Request
```http
POST /api/v1/security/gdpr/data-request
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "user_email": "user@company.com",
  "request_type": "access"
}
```

**Request Types**:
- `access`: Data portability request
- `portability`: Export user data
- `erasure`: Right to be forgotten
- `rectification`: Data correction

### Analytics Endpoints

**Base Path**: `/api/v1/analytics`

#### Business Metrics
```http
GET /api/v1/analytics/business
Authorization: Bearer {jwt_token}
```

**Response**:
```json
{
  "total_contracts": 127,
  "active_contracts": 45,
  "draft_contracts": 23,
  "completed_contracts": 59,
  "total_contract_value": 234500.00,
  "average_contract_value": 1847.24,
  "compliance_score_average": 0.94,
  "high_risk_contracts": 3,
  "growth_rate": 23.5
}
```

#### Time Series Metrics
```http
GET /api/v1/analytics/time-series/contracts_created?period=monthly&days=90
Authorization: Bearer {jwt_token}
```

---

## AI Integration Features

### Groq AI Service Integration

**Location**: `app/services/ai_service.py`

The AI service integrates with Groq API using the OpenAI GPT-OSS-120B model for ultra-fast inference.

#### Service Architecture
```python
class GroqAIService:
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = "openai/gpt-oss-120b"  # 120B parameter MoE model
```

#### Contract Generation Flow

**1. Input Processing**
```python
async def generate_contract(self, request: ContractGenerationRequest) -> ContractGenerationResponse:
    """
    Process:
    1. Build comprehensive prompt with UK legal context
    2. Include contract-specific metadata
    3. Set appropriate generation parameters
    4. Call Groq API with retry logic
    5. Process and validate response
    6. Calculate confidence score
    """
```

**2. Prompt Engineering**
```python
def _build_contract_prompt(self, request: ContractGenerationRequest) -> str:
    """
    Comprehensive prompt structure:
    - Contract type and business requirements
    - UK legal compliance mandates
    - GDPR and data protection clauses
    - Standard commercial terms
    - Dispute resolution mechanisms
    - Termination and notice requirements
    """
    
    prompt = f"""
Generate a professional UK legal contract based on the following requirements:

CONTRACT TYPE: {request.contract_type}
PLAIN ENGLISH REQUIREMENTS: {request.plain_english_input}

COMPLIANCE REQUIREMENTS:
1. Full compliance with UK law and regulations
2. GDPR compliance clauses where applicable
3. Professional legal language and structure
4. Enforceable under UK jurisdiction
5. Standard UK commercial terms

Generate a complete, professional contract suitable for business use.
"""
```

**3. Response Processing**
```python
# Extract and validate generated content
content = response.choices[0].message.content
confidence_score = self._calculate_confidence_score(content, request.prompt)

# Package response with metadata
return ContractGenerationResponse(
    content=content,
    model_name=self.model,
    processing_time_ms=processing_time,
    token_usage=response.usage,
    confidence_score=confidence_score
)
```

#### Compliance Analysis Flow

**1. Analysis Request**
```python
async def analyze_compliance(self, request: ComplianceAnalysisRequest) -> ComplianceAnalysisResponse:
    """
    Analyze contract for UK legal compliance:
    - GDPR compliance scoring
    - Employment law adherence
    - Consumer rights compliance
    - Commercial terms validation
    - Risk factor identification
    """
```

**2. Compliance Prompt Structure**
```python
def _build_compliance_prompt(self, request: ComplianceAnalysisRequest) -> str:
    """
    Structured analysis prompt:
    - Overall UK law compliance (0-1 score)
    - GDPR compliance assessment
    - Employment law validation
    - Consumer protection adherence
    - Risk scoring (1-10 scale)
    - Specific recommendations
    """
```

**3. Response Parsing**
```python
def _parse_compliance_response(self, content: str) -> ComplianceAnalysisResponse:
    """
    Parse AI response into structured compliance data:
    - Extract JSON compliance scores
    - Process risk factors list
    - Parse recommendations
    - Handle parsing errors gracefully
    """
```

#### AI Performance Optimization

**Model Configuration**:
```python
# Optimized for legal document generation
generation_params = {
    "max_tokens": 3000,
    "temperature": 0.3,  # Lower for legal accuracy
    "model": "openai/gpt-oss-120b"  # 120B parameter model
}

compliance_params = {
    "max_tokens": 2000,
    "temperature": 0.2,  # Very low for analysis
    "model": "openai/gpt-oss-120b"
}
```

**Quality Assurance**:
```python
def _calculate_confidence_score(self, content: str, prompt: str) -> float:
    """
    Heuristic-based confidence scoring:
    - Content length validation
    - Legal terminology presence
    - Structure assessment
    - Completeness indicators
    """
```

#### Error Handling & Resilience

```python
# Comprehensive error handling
try:
    response = await self.client.chat.completions.create(...)
except Exception as e:
    logger.error(f"AI generation failed: {str(e)}")
    raise Exception(f"AI service error: {str(e)}")

# Health check monitoring
async def health_check(self) -> Dict[str, Any]:
    """
    Proactive health monitoring:
    - API connectivity test
    - Response time measurement
    - Token usage tracking
    - Error rate monitoring
    """
```

---

## Authentication & Security

### JWT Authentication System

**Location**: `app/core/security.py`, `app/core/auth.py`

#### Token Management
```python
# JWT Configuration
ALGORITHM = "HS256"
SECRET_KEY = settings.SECRET_KEY
EXPIRATION = 24  # hours

def create_access_token(subject: Union[str, int], 
                       expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT token with:
    - User ID as subject
    - Configurable expiration
    - UTC timestamps
    - Secure payload encoding
    """
```

**Token Structure**:
```json
{
  "sub": "user_id",
  "exp": 1704110400,
  "iat": 1704024000
}
```

#### Authentication Flow
```python
async def get_current_user(token: str = Depends(oauth2_scheme), 
                          db: Session = Depends(get_db)) -> User:
    """
    Authentication dependency:
    1. Extract token from Authorization header
    2. Verify JWT signature and expiration
    3. Load user from database
    4. Validate user is active
    5. Return authenticated user object
    """
```

**Usage in API Endpoints**:
```python
@router.post("/contracts/")
async def create_contract(
    contract_data: ContractCreate,
    current_user: User = Depends(get_current_user),  # Auth required
    db: Session = Depends(get_db)
):
    """Endpoint with authentication requirement"""
```

### Authorization System

#### Company-Based Access Control
```python
def require_company_access(current_user: User, company_id: str):
    """
    Verify user has access to company resources:
    - Admin users: Access to all companies
    - Regular users: Access to own company only
    - Raises HTTP 403 for unauthorized access
    """
    
    if not current_user.is_admin and current_user.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
```

#### Role-Based Dependencies
```python
async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Admin-only endpoint dependency"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
```

### Security Middleware

#### Security Headers
```python
@app.middleware("http")
async def security_headers(request: Request, call_next):
    """
    Add security headers to all responses:
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - X-XSS-Protection: 1; mode=block
    - Referrer-Policy: strict-origin-when-cross-origin
    - Strict-Transport-Security (production only)
    """
```

#### Request Monitoring
```python
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """
    Request monitoring and logging:
    - Processing time measurement
    - Request/response logging
    - Error tracking
    - Performance metrics
    """
```

### Password Security

```python
# Password hashing with bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Secure password hashing"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Password verification with error handling"""
    if not hashed_password or not plain_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False
```

### Security Monitoring

**Location**: `app/services/security_service.py`

```python
class SecurityMonitor:
    """
    Security event monitoring:
    - Failed login attempts
    - Rate limit violations
    - Suspicious request patterns
    - Account lockouts
    - Access violations
    """
    
    def __init__(self):
        self.security_events: List[SecurityEvent] = []
        self.rate_limiter = RateLimiter()
        self.suspicious_patterns: Set[str] = set()
    
    def record_security_event(self, event_type: str, details: Dict[str, Any]):
        """Record security events for monitoring"""
    
    def get_security_summary(self, hours: int) -> Dict[str, Any]:
        """Generate security summary for admin dashboard"""
```

### GDPR Compliance

#### Data Subject Rights
```python
@router.post("/security/gdpr/data-request")
async def create_gdpr_data_request(gdpr_request: GDPRDataRequest):
    """
    GDPR data subject rights implementation:
    - Right of Access: Export user data
    - Right to Portability: Structured data export
    - Right to Erasure: Delete user data
    - Right to Rectification: Correct user data
    """
    
    if gdpr_request.request_type == "access":
        # Export all user data in structured format
    elif gdpr_request.request_type == "erasure":
        # Implement right to be forgotten
    # ... handle other request types
```

---

## Database Operations

### Repository Pattern Implementation

**Location**: `app/infrastructure/repositories/sqlalchemy_contract_repository.py`

The repository pattern abstracts data access and provides domain-focused interfaces.

#### Contract Repository
```python
class SQLAlchemyContractRepository(ContractRepository):
    """
    SQLAlchemy implementation of contract repository
    
    Features:
    - Domain entity mapping
    - Complex query support
    - Pagination handling
    - Transaction management
    - Optimistic locking
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
```

#### Core Operations
```python
async def save(self, contract: Contract) -> Contract:
    """
    Save contract with version control:
    1. Map domain entity to database model
    2. Handle new vs existing contracts
    3. Update version and timestamps
    4. Commit transaction
    5. Refresh entity with generated IDs
    """

async def find_by_id(self, contract_id: ContractId) -> Optional[Contract]:
    """
    Find contract by ID:
    1. Query database by contract ID
    2. Check if contract exists
    3. Map database model to domain entity
    4. Return domain object or None
    """

async def get_by_id(self, contract_id: ContractId) -> Contract:
    """
    Get contract with exception handling:
    1. Call find_by_id()
    2. Raise ContractNotFoundError if not found
    3. Return domain entity
    """
```

#### Complex Queries
```python
async def find_with_filter(self, contract_filter: ContractFilter, 
                          page_request: Optional[PageRequest] = None) -> PageResult:
    """
    Complex filtering with pagination:
    1. Build SQLAlchemy query from filter
    2. Apply company access restrictions
    3. Add sorting and pagination
    4. Execute query and count total
    5. Map results to domain entities
    6. Return paginated result
    """
    
    query = self.db.query(Contract)
    
    # Apply filters
    if contract_filter.company_id:
        query = query.filter(Contract.company_id == contract_filter.company_id)
    
    if contract_filter.contract_type:
        query = query.filter(Contract.contract_type == contract_filter.contract_type)
    
    if contract_filter.status:
        query = query.filter(Contract.status == contract_filter.status)
    
    # Text search across multiple fields
    if contract_filter.title_contains:
        search_term = f"%{contract_filter.title_contains}%"
        query = query.filter(
            or_(
                Contract.title.ilike(search_term),
                Contract.client_name.ilike(search_term),
                Contract.plain_english_input.ilike(search_term)
            )
        )
```

#### Business Intelligence Queries
```python
async def find_expiring_contracts(self, days_ahead: int = 30) -> List[Contract]:
    """
    Find contracts expiring soon:
    - Active status contracts only
    - End date within specified days
    - Ordered by expiration date
    """
    
    cutoff_date = datetime.utcnow() + timedelta(days=days_ahead)
    
    query = self.db.query(Contract).filter(
        Contract.status == ContractStatus.ACTIVE,
        Contract.end_date <= cutoff_date,
        Contract.end_date >= datetime.utcnow()
    ).order_by(Contract.end_date)

async def find_contracts_requiring_compliance_review(self, company_id: str) -> List[Contract]:
    """
    Find contracts needing compliance review:
    - No compliance score OR
    - Low compliance score OR
    - High risk score
    """
```

### Database Models

**Location**: `app/infrastructure/database/models.py`

SQLAlchemy models represent the database schema.

#### Core Models
```python
class Contract(Base):
    __tablename__ = "contracts"
    
    # Identity
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Business Data
    title = Column(String, nullable=False)
    contract_type = Column(Enum(ContractType), nullable=False)
    status = Column(Enum(ContractStatus), default=ContractStatus.DRAFT)
    plain_english_input = Column(Text, nullable=False)
    
    # Parties
    client_name = Column(String, nullable=False)
    client_email = Column(String, nullable=True)
    supplier_name = Column(String, nullable=True)
    
    # Business Context
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Content
    generated_content = Column(Text, nullable=True)
    final_content = Column(Text, nullable=True)
    
    # Metadata
    contract_value = Column(Float, nullable=True)
    currency = Column(String, default="GBP")
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    
    # Version Control
    version = Column(Integer, default=1)
    is_current_version = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="contracts")
    created_by_user = relationship("User", back_populates="created_contracts")
    ai_generation = relationship("AIGeneration", uselist=False)
    compliance_scores = relationship("ComplianceScore", back_populates="contract")
```

#### Related Models
```python
class AIGeneration(Base):
    """AI generation metadata and results"""
    __tablename__ = "ai_generations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    model_name = Column(String, nullable=False)
    model_version = Column(String, nullable=True)
    input_prompt = Column(Text, nullable=False)
    generated_content = Column(Text, nullable=False)
    processing_time_ms = Column(Float, nullable=False)
    token_usage = Column(JSON, nullable=True)
    confidence_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ComplianceScore(Base):
    """Contract compliance analysis results"""
    __tablename__ = "compliance_scores"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    contract_id = Column(String, ForeignKey("contracts.id"), nullable=False)
    overall_score = Column(Float, nullable=False)
    gdpr_compliance = Column(Float, nullable=True)
    employment_law_compliance = Column(Float, nullable=True)
    consumer_rights_compliance = Column(Float, nullable=True)
    commercial_terms_compliance = Column(Float, nullable=True)
    risk_score = Column(Integer, nullable=False)
    risk_factors = Column(JSON, default=[])
    recommendations = Column(JSON, default=[])
    analysis_version = Column(String, default="1.0")
    analysis_date = Column(DateTime(timezone=True), server_default=func.now())
```

### Database Configuration

**Location**: `app/core/database.py`

```python
# Database URL configuration
DATABASE_URL = "postgresql://localhost/pactoria_dev"  # Development
# DATABASE_URL = "oracle://..." # Production Oracle

# SQLAlchemy engine configuration
engine = create_async_engine(
    DATABASE_URL,
    echo=settings.DEBUG,  # SQL logging in debug mode
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True  # Connection validation
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession
)

# Database dependency
async def get_db() -> AsyncGenerator[Session, None]:
    """
    Database session dependency:
    - Creates session per request
    - Handles connection cleanup
    - Provides transaction management
    """
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

---

## Infrastructure Components

### External Service Integrations

#### Groq AI Service Client
**Location**: `app/services/ai_service.py`

```python
class GroqAIService:
    """
    Groq API integration for AI-powered features:
    - Contract generation
    - Compliance analysis
    - Risk assessment
    - Template recommendations
    """
    
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = "openai/gpt-oss-120b"
    
    # Connection management
    async def health_check(self) -> Dict[str, Any]:
        """Monitor service health and connectivity"""
```

#### Configuration Management
**Location**: `app/core/config.py`

```python
class Settings(BaseSettings):
    """
    Environment-based configuration:
    - Application settings
    - Database connections
    - API keys and secrets
    - Feature flags
    - Security parameters
    """
    
    # Application
    APP_NAME: str = "Pactoria Contract Management"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "postgresql://localhost/pactoria_dev"
    
    # Security
    SECRET_KEY: str = "change-this-in-production"
    JWT_EXPIRATION_HOURS: int = 24
    
    # External Services
    GROQ_API_KEY: str = "gsk_..."
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    
    # Business Rules
    MAX_USERS_PER_ACCOUNT: int = 5
    MIN_COMPLIANCE_SCORE: float = 0.95
    
    class Config:
        env_file = ".env"
        case_sensitive = True
```

### Application Lifecycle Management

**Location**: `app/main.py`

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown management:
    
    Startup:
    - Database table creation
    - Service health checks
    - Cache initialization
    - Background task setup
    
    Shutdown:
    - Connection cleanup
    - Background task termination
    - Resource disposal
    """
    # Startup
    logger.info("Starting Pactoria MVP Backend...")
    await create_tables()
    logger.info("✅ Database tables created")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Pactoria MVP Backend...")

# Application instance with comprehensive configuration
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None
)
```

### Middleware Stack

#### Security Middleware
```python
# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Security headers
@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Apply security headers to all responses"""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response
```

#### Monitoring Middleware
```python
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """
    Request processing middleware:
    - Measure request processing time
    - Log API requests and responses
    - Track performance metrics
    - Handle errors gracefully
    """
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.4f}s")
        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"{request.method} {request.url.path} - Error: {str(e)} - {process_time:.4f}s")
        raise
```

### Deployment Configuration

#### Health Check Endpoints
```python
@app.get("/health")
async def health_check():
    """Basic health check for load balancers"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/ready")
async def readiness_check():
    """Kubernetes readiness probe"""
    return {
        "ready": True,
        "checks": {
            "database": "healthy",
            "ai_service": "healthy",
            "configuration": "healthy"
        }
    }
```

---

## Error Handling & Validation

### Exception Hierarchy

**Location**: `app/core/exceptions.py`

```python
class APIExceptionFactory:
    """Factory for creating consistent API exceptions"""
    
    @staticmethod
    def not_found(resource_type: str, resource_id: str) -> HTTPException:
        return HTTPException(
            status_code=404,
            detail=f"{resource_type} with ID {resource_id} not found"
        )
    
    @staticmethod
    def validation_error(field: str, message: str) -> HTTPException:
        return HTTPException(
            status_code=422,
            detail={"field": field, "message": message}
        )

class DomainValidationError(Exception):
    """Domain-level validation errors"""
    def __init__(self, message: str, field: str = None, value: Any = None):
        self.message = message
        self.field = field
        self.value = value
        super().__init__(self.message)

class BusinessRuleViolationError(Exception):
    """Business rule violations"""
    pass

class ContractStateError(Exception):
    """Invalid contract state transitions"""
    def __init__(self, message: str, current_state: str, expected_state: str = None):
        self.current_state = current_state
        self.expected_state = expected_state
        super().__init__(message)
```

### Global Exception Handler

```python
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handling:
    - Log all unhandled exceptions
    - Return consistent error responses
    - Hide implementation details in production
    - Maintain request context
    """
    logger.error(f"Global exception handler caught: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "path": str(request.url.path),
            "method": request.method
        }
    )
```

### Input Validation

**Location**: `app/core/validation.py`

```python
class ResourceValidator:
    """Business validation utilities"""
    
    @staticmethod
    def validate_user_has_company(user: User):
        """Ensure user is associated with a company"""
        if not user.company_id:
            raise HTTPException(
                status_code=403,
                detail="User must be associated with a company"
            )
    
    @staticmethod
    def validate_contract_state_for_modification(contract: Contract):
        """Ensure contract can be modified"""
        if contract.status == ContractStatus.COMPLETED:
            raise HTTPException(
                status_code=400,
                detail="Cannot modify completed contract"
            )
```

### Audit Logging

**Location**: `app/core/validation.py`

```python
class AuditLogHelper:
    """Audit trail utilities"""
    
    @staticmethod
    def create_audit_log(
        event_type: str,
        resource_type: str,
        resource_id: str,
        user_id: str,
        old_values: Optional[Dict] = None,
        new_values: Optional[Dict] = None
    ) -> AuditLog:
        """Create standardized audit log entry"""
        
        return AuditLog(
            event_type=event_type,
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id,
            old_values=old_values,
            new_values=new_values,
            timestamp=get_current_utc(),
            ip_address=get_client_ip(),  # From request context
            user_agent=get_user_agent()  # From request context
        )
```

---

## Monitoring & Analytics

### Business Analytics

**Location**: `app/api/v1/analytics.py`

Comprehensive business intelligence and operational metrics.

#### Business Metrics Dashboard
```python
@router.get("/business", response_model=BusinessMetricsResponse)
async def get_business_metrics(company: Company = Depends(get_user_company)):
    """
    Key business metrics for SME dashboard:
    - Contract volume and distribution
    - Financial metrics (values, averages)
    - Compliance scoring
    - Growth trends
    - Risk indicators
    """
    
    # Contract volume metrics
    total_contracts = db.query(Contract).filter(...).count()
    active_contracts = db.query(Contract).filter(..., status=ACTIVE).count()
    
    # Financial metrics
    total_value = db.query(func.sum(Contract.contract_value)).scalar()
    average_value = db.query(func.avg(Contract.contract_value)).scalar()
    
    # Compliance metrics
    compliance_avg = db.query(func.avg(ComplianceScore.overall_score)).scalar()
    high_risk_contracts = db.query(...).filter(risk_score >= 7).count()
    
    # Growth calculation
    growth_rate = calculate_month_over_month_growth(...)
```

#### Time Series Analytics
```python
@router.get("/time-series/{metric}", response_model=TimeSeriesResponse)
async def get_time_series_metrics(
    metric: str,
    period: MetricPeriod = Query(MetricPeriod.MONTHLY),
    days: int = Query(30, ge=7, le=365)
):
    """
    Time-based analytics:
    - contracts_created: Contract creation trends
    - contract_value: Financial trends
    - compliance_scores: Compliance trends over time
    
    Supports daily, weekly, monthly aggregation
    """
    
    if metric == "contracts_created":
        # Group contracts by creation date with period aggregation
        results = db.query(
            date_format.label('date'),
            func.count(Contract.id).label('count')
        ).filter(...).group_by(date_format).all()
```

#### Compliance Analytics
```python
@router.get("/compliance", response_model=ComplianceMetricsResponse)
async def get_compliance_metrics():
    """
    Compliance dashboard metrics:
    - Average scores by compliance area
    - Risk distribution (high/medium/low)
    - Compliance trends over time
    - Outstanding recommendations count
    """
    
    # Compliance score averages
    compliance_stats = db.query(
        func.avg(ComplianceScore.overall_score).label('overall'),
        func.avg(ComplianceScore.gdpr_compliance).label('gdpr'),
        func.avg(ComplianceScore.employment_law_compliance).label('employment')
    ).first()
    
    # Risk distribution
    high_risk = db.query(...).filter(risk_score >= 7).count()
    medium_risk = db.query(...).filter(risk_score.between(4, 6)).count()
    low_risk = db.query(...).filter(risk_score < 4).count()
```

### System Monitoring

#### Performance Metrics
```python
@router.get("/performance", response_model=PerformanceMetricsResponse)
async def get_performance_metrics(current_user: User = Depends(get_admin_user)):
    """
    System performance monitoring (admin only):
    - AI generation performance
    - API response times
    - Success rates by endpoint
    - Token usage statistics
    """
    
    # AI performance metrics
    ai_stats = db.query(
        func.avg(AIGeneration.processing_time_ms).label('avg_time'),
        func.sum(func.json_extract(AIGeneration.token_usage, '$.total_tokens')).label('total_tokens')
    ).first()
    
    # API performance tracking
    api_response_times = {
        "/auth/login": 45.2,
        "/contracts": 89.1,
        "/contracts/{id}/generate": ai_generation_avg_time,
        "/contracts/{id}/analyze": compliance_avg_time
    }
```

#### System Health Monitoring
```python
@router.get("/system/health", response_model=SystemHealthResponse)
async def get_system_health(current_user: User = Depends(get_admin_user)):
    """
    Comprehensive system health check:
    - Service availability
    - Database connectivity
    - AI service status
    - Performance indicators
    - Resource utilization
    """
    
    # Check AI service health
    try:
        ai_health = await ai_service.health_check()
        ai_service_health = ai_health.get("status", "unknown")
    except Exception:
        ai_service_health = "unhealthy"
    
    # Database health check
    try:
        db.execute(text("SELECT 1"))
        database_health = "healthy"
    except Exception:
        database_health = "unhealthy"
```

### Security Monitoring

**Location**: `app/services/security_service.py`

```python
class SecurityMonitor:
    """
    Security event monitoring and threat detection:
    - Failed authentication attempts
    - Rate limiting violations
    - Suspicious access patterns
    - Data access violations
    """
    
    def __init__(self):
        self.security_events: List[SecurityEvent] = []
        self.rate_limiter = RateLimiter()
        self.suspicious_patterns: Set[str] = set()
    
    def record_security_event(self, event_type: str, severity: str, 
                             details: Dict[str, Any], user_id: str = None):
        """Record security events for analysis"""
        event = SecurityEvent(
            id=str(uuid.uuid4()),
            event_type=event_type,
            severity=severity,
            details=details,
            user_id=user_id,
            timestamp=datetime.utcnow()
        )
        self.security_events.append(event)
    
    def get_security_summary(self, hours: int) -> Dict[str, Any]:
        """Generate security summary for admin dashboard"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        recent_events = [e for e in self.security_events if e.timestamp >= cutoff]
        
        return {
            "total_events": len(recent_events),
            "event_types": Counter(e.event_type for e in recent_events),
            "severity_counts": Counter(e.severity for e in recent_events),
            "high_priority_events": len([e for e in recent_events if e.severity == "high"]),
            "time_window_hours": hours
        }
```

### Audit Trail System

**Location**: `app/infrastructure/database/models.py`

```python
class AuditLog(Base):
    """
    Comprehensive audit logging for compliance:
    - All user actions
    - Data modifications
    - System events
    - Access attempts
    """
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_type = Column(String, nullable=False)  # create, update, delete, login, etc.
    resource_type = Column(String, nullable=False)  # contract, user, company
    resource_id = Column(String, nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Change tracking
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    
    # Context information
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    session_id = Column(String, nullable=True)
    
    # Relationships for easier querying
    contract_id = Column(String, ForeignKey("contracts.id"), nullable=True)
    company_id = Column(String, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    contract = relationship("Contract")
```

#### Audit Log API
```python
@router.get("/security/audit-logs", response_model=AuditLogResponse)
async def get_audit_logs(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    event_type: Optional[str] = None,
    resource_type: Optional[str] = None,
    hours: int = Query(168, ge=1, le=8760)  # Last week to last year
):
    """
    Retrieve audit logs with filtering:
    - Pagination support
    - Time-based filtering
    - Event type filtering
    - Resource type filtering
    - Company-scoped access for non-admin users
    """
```

---

## Error Handling & Edge Cases

### Domain-Level Error Handling

Each major functionality includes comprehensive error handling:

#### Contract Creation Errors
- **Validation Errors**: Empty title, invalid contract type, missing required fields
- **Business Rule Violations**: User not associated with company, template not found
- **Database Errors**: Unique constraint violations, foreign key errors

#### AI Service Error Handling
- **API Failures**: Network timeouts, authentication errors, rate limiting
- **Content Generation Errors**: Invalid prompts, empty responses, parsing failures
- **Compliance Analysis Errors**: Malformed content, analysis timeouts

#### Authentication & Authorization Errors
- **Token Errors**: Expired tokens, invalid signatures, malformed tokens
- **Permission Errors**: Insufficient privileges, company access violations
- **Account Issues**: Inactive accounts, suspended users

### Graceful Degradation

The system implements graceful degradation strategies:

#### AI Service Fallbacks
```python
# If AI generation fails, provide helpful error messages
try:
    ai_response = await ai_service.generate_contract(request)
except Exception as e:
    # Log error and provide fallback response
    logger.error(f"AI generation failed: {str(e)}")
    return {
        "error": "AI service temporarily unavailable",
        "fallback_options": [
            "Use existing template",
            "Create contract manually",
            "Retry generation later"
        ]
    }
```

#### Database Connection Issues
```python
# Retry logic for transient database errors
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def save_with_retry(self, contract: Contract) -> Contract:
    """Save contract with automatic retry on transient errors"""
```

---

This comprehensive functionality guide covers all aspects of the Pactoria MVP backend system. The implementation follows Domain-Driven Design principles with clean architecture, ensuring maintainability, testability, and scalability for UK SMEs' contract management needs.

For specific implementation details or additional technical information, refer to the source code files referenced throughout this guide.