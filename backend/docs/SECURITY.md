# Security Architecture and Compliance Documentation

**Pactoria MVP Backend - Comprehensive Security Framework**

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication and Authorization](#authentication-and-authorization)
3. [Data Protection and Privacy](#data-protection-and-privacy)
4. [API Security](#api-security)
5. [Infrastructure Security](#infrastructure-security)
6. [UK Legal Compliance](#uk-legal-compliance)
7. [Threat Mitigation](#threat-mitigation)
8. [Security Monitoring](#security-monitoring)
9. [Incident Response](#incident-response)
10. [Compliance Auditing](#compliance-auditing)

---

## Security Overview

Pactoria implements enterprise-grade security measures designed specifically for UK legal and business requirements. The security architecture protects sensitive contract data while ensuring compliance with GDPR, UK data protection laws, and industry best practices.

### Security Principles

**Defense in Depth**: Multiple layers of security controls
- Network security (Azure infrastructure)
- Application security (input validation, authentication)
- Data security (encryption, access controls)
- Monitoring and detection (audit trails, anomaly detection)

**Zero Trust Architecture**: Never trust, always verify
- Explicit verification for every user and device
- Least privilege access principles
- Continuous security validation

**Privacy by Design**: Built-in privacy protection
- Data minimization principles
- Purpose limitation and consent management
- Transparent data processing

### Compliance Framework

| Regulation | Status | Implementation |
|------------|---------|----------------|
| UK GDPR | ✅ Compliant | Data protection, subject rights, breach notification |
| Data Protection Act 2018 | ✅ Compliant | UK-specific data protection requirements |
| PCI DSS | 🔄 N/A (No card data) | Not applicable to MVP |
| ISO 27001 | 🎯 Future | Information security management |
| SOC 2 Type II | 🎯 Future | Service organization controls |

---

## Authentication and Authorization

### JWT-Based Authentication

**Implementation**: Secure token-based authentication with configurable expiration.

```python
# app/core/auth.py
class JWTAuthManager:
    """JWT authentication manager with security controls."""
    
    def __init__(self):
        self.algorithm = "HS256"
        self.secret_key = settings.SECRET_KEY
        self.expiration_hours = settings.JWT_EXPIRATION_HOURS
    
    def create_access_token(self, data: dict) -> str:
        """
        Create JWT token with security features:
        - Configurable expiration (production: 8 hours, dev: 24 hours)
        - Secure payload encoding
        - UTC timestamp normalization
        - Subject claim validation
        """
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(hours=self.expiration_hours)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "iss": "pactoria-api",  # Issuer claim
            "aud": "pactoria-app"   # Audience claim
        })
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> dict:
        """
        Verify JWT token with comprehensive validation:
        - Signature verification
        - Expiration checking
        - Issuer and audience validation
        - Malformed token detection
        """
        try:
            payload = jwt.decode(
                token, 
                self.secret_key, 
                algorithms=[self.algorithm],
                audience="pactoria-app",
                issuer="pactoria-api"
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired")
        except jwt.InvalidTokenError:
            raise AuthenticationError("Invalid token")
```

**Security Features**:
- Strong secret key generation (minimum 64 characters)
- Token expiration with refresh capability
- Audience and issuer claims validation
- Secure token transmission (HTTPS only)

### Role-Based Access Control (RBAC)

**User Roles**:
```python
class UserRole(str, enum.Enum):
    ADMIN = "admin"                    # Full system access
    CONTRACT_MANAGER = "contract_manager"  # Contract CRUD, AI features
    LEGAL_REVIEWER = "legal_reviewer"     # Contract review, compliance
    VIEWER = "viewer"                     # Read-only access

# Permission matrix
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [
        "contracts.*",
        "users.*", 
        "companies.*",
        "analytics.*",
        "security.*"
    ],
    UserRole.CONTRACT_MANAGER: [
        "contracts.create",
        "contracts.read",
        "contracts.update", 
        "contracts.generate",
        "contracts.analyze",
        "templates.read"
    ],
    UserRole.LEGAL_REVIEWER: [
        "contracts.read",
        "contracts.review",
        "contracts.approve",
        "compliance.*",
        "templates.*"
    ],
    UserRole.VIEWER: [
        "contracts.read",
        "analytics.read"
    ]
}
```

### Multi-Tenant Security

**Company Data Isolation**: Ensures complete data separation between companies.

```python
# app/core/auth.py
def require_company_access(current_user: User, company_id: str) -> None:
    """
    Enforce company-based data isolation:
    - Validates user belongs to specified company
    - Prevents cross-company data access
    - Logs unauthorized access attempts
    - Raises detailed security exceptions
    """
    if not current_user.company_id:
        security_monitor.record_security_event(
            "unauthorized_access_attempt",
            "high",
            {"user_id": current_user.id, "reason": "no_company_association"}
        )
        raise SecurityError("User not associated with any company")
    
    if current_user.company_id != company_id:
        security_monitor.record_security_event(
            "cross_company_access_attempt", 
            "critical",
            {
                "user_id": current_user.id,
                "user_company": current_user.company_id,
                "requested_company": company_id
            }
        )
        raise SecurityError("Access denied to company resources")

# Database query filtering
async def get_user_contracts(user: User, db: Session) -> List[Contract]:
    """All queries automatically filtered by company."""
    return await db.query(Contract)\
        .filter(Contract.company_id == user.company_id)\
        .all()
```

---

## Data Protection and Privacy

### Encryption Standards

**Data at Rest**: All sensitive data encrypted using AES-256.

```python
# app/core/encryption.py
from cryptography.fernet import Fernet

class DataEncryption:
    """Handle encryption of sensitive data fields."""
    
    def __init__(self):
        self.key = base64.urlsafe_b64decode(settings.ENCRYPTION_KEY)
        self.cipher = Fernet(self.key)
    
    def encrypt_sensitive_data(self, data: str) -> str:
        """
        Encrypt sensitive contract content:
        - AES-256 encryption
        - Base64 encoding for storage
        - Key rotation support
        """
        if not data:
            return data
        return self.cipher.encrypt(data.encode()).decode()
    
    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data with error handling."""
        if not encrypted_data:
            return encrypted_data
        try:
            return self.cipher.decrypt(encrypted_data.encode()).decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise SecurityError("Data decryption failed")

# Database model with automatic encryption
class Contract(Base):
    __tablename__ = "contracts"
    
    # Sensitive fields automatically encrypted
    _final_content = Column(Text, nullable=True)
    _plain_english_input = Column(Text, nullable=True) 
    
    @hybrid_property
    def final_content(self) -> Optional[str]:
        if self._final_content:
            return encryption_service.decrypt_sensitive_data(self._final_content)
        return None
    
    @final_content.setter 
    def final_content(self, value: Optional[str]) -> None:
        if value:
            self._final_content = encryption_service.encrypt_sensitive_data(value)
        else:
            self._final_content = None
```

**Data in Transit**: All communication secured with TLS 1.3.

```python
# app/main.py - HTTPS enforcement
@app.middleware("http")
async def enforce_https(request: Request, call_next):
    """Enforce HTTPS in production."""
    if settings.ENVIRONMENT == "production":
        if request.url.scheme != "https":
            https_url = request.url.replace(scheme="https")
            return RedirectResponse(url=str(https_url), status_code=301)
    
    response = await call_next(request)
    
    # Security headers
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response
```

### Personal Data Management

**Data Classification**:
```python
class DataClassification(str, enum.Enum):
    PUBLIC = "public"              # No restrictions
    INTERNAL = "internal"          # Company internal use
    CONFIDENTIAL = "confidential"  # Sensitive business data
    RESTRICTED = "restricted"      # Personal data, legal content

# Automated data classification
class ContractDataClassifier:
    """Automatically classify contract data sensitivity."""
    
    def classify_contract_content(self, content: str) -> DataClassification:
        """
        Classify contract content based on:
        - Personal identifiers (names, emails, addresses)
        - Financial information
        - Legal sensitive terms
        - UK data protection indicators
        """
        if self._contains_personal_data(content):
            return DataClassification.RESTRICTED
        elif self._contains_financial_data(content):
            return DataClassification.CONFIDENTIAL
        else:
            return DataClassification.INTERNAL
```

**Data Retention**: Automated lifecycle management compliant with UK law.

```python
# app/services/data_retention_service.py
class DataRetentionService:
    """Manage data retention according to UK legal requirements."""
    
    RETENTION_PERIODS = {
        "contracts": 7 * 365,          # 7 years (UK contract law)
        "audit_logs": 7 * 365,         # 7 years (financial regulations)
        "user_data": 6 * 365,          # 6 years after account closure
        "ai_generations": 2 * 365      # 2 years (operational data)
    }
    
    async def apply_retention_policy(self):
        """
        Automated data purging:
        1. Identify data past retention period
        2. Create secure deletion audit trail
        3. Permanently delete data using cryptographic erasure
        4. Verify deletion completion
        5. Update data subject records
        """
        for data_type, retention_days in self.RETENTION_PERIODS.items():
            cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
            
            expired_records = await self._find_expired_records(data_type, cutoff_date)
            
            for record in expired_records:
                await self._secure_delete_record(record)
                await self._create_deletion_audit_log(record)
```

---

## API Security

### Input Validation and Sanitization

**Request Validation**: Comprehensive input validation using Pydantic.

```python
# app/schemas/contracts.py
class ContractCreate(BaseModel):
    """Contract creation with comprehensive validation."""
    
    title: str = Field(
        ..., 
        min_length=1, 
        max_length=200,
        regex=r"^[a-zA-Z0-9\s\-_.,()&]+$",  # Prevent XSS
        description="Contract title (alphanumeric and safe characters only)"
    )
    
    plain_english_input: str = Field(
        ...,
        min_length=10,
        max_length=10000,
        description="Plain English contract requirements"
    )
    
    client_email: Optional[EmailStr] = Field(
        None,
        description="Client email address (validated format)"
    )
    
    contract_value: Optional[confloat(ge=0, le=999999999)] = Field(
        None,
        description="Contract value (non-negative, reasonable maximum)"
    )
    
    @validator('plain_english_input')
    def validate_and_sanitize_input(cls, v):
        """
        Sanitize and validate plain English input:
        - Remove potentially malicious content
        - Validate against injection attempts
        - Ensure reasonable content length
        """
        if not v or not v.strip():
            raise ValueError("Plain English input cannot be empty")
        
        # Basic XSS prevention
        dangerous_patterns = ['<script', '<?php', 'javascript:', 'vbscript:']
        v_lower = v.lower()
        for pattern in dangerous_patterns:
            if pattern in v_lower:
                raise ValueError("Input contains potentially dangerous content")
        
        return v.strip()
    
    @validator('title')
    def validate_title_content(cls, v):
        """Validate title for business appropriateness."""
        if len(v.strip()) == 0:
            raise ValueError("Title cannot be empty")
        
        # Check for suspicious patterns
        if any(char in v for char in ['<', '>', '{', '}', '`']):
            raise ValueError("Title contains invalid characters")
        
        return v.strip()
```

### Rate Limiting and DDoS Protection

**Rate Limiting**: Prevent API abuse and ensure service availability.

```python
# app/middleware/rate_limiting.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Rate limiter configuration
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://localhost:6379/0"  # Production: use Azure Redis
)

# Rate limiting by endpoint type
@app.middleware("http")
async def rate_limiting_middleware(request: Request, call_next):
    """
    Apply rate limiting based on endpoint sensitivity:
    - Authentication: 10 requests/minute
    - AI Generation: 20 requests/hour per user
    - Contract CRUD: 100 requests/hour per user
    - Public APIs: 1000 requests/hour per IP
    """
    
    path = request.url.path
    client_ip = get_remote_address(request)
    
    # AI-powered endpoints (most expensive)
    if "/generate" in path or "/analyze" in path:
        rate_limit = "20/hour"
        key = f"ai:{client_ip}"
    
    # Authentication endpoints (prevent brute force)
    elif "/auth/" in path:
        rate_limit = "10/minute"
        key = f"auth:{client_ip}"
    
    # Standard API endpoints
    else:
        rate_limit = "100/hour"
        key = f"api:{client_ip}"
    
    # Check rate limit
    if not await check_rate_limit(key, rate_limit):
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded",
                "retry_after": await get_retry_after(key),
                "limit": rate_limit
            }
        )
    
    return await call_next(request)

# Advanced rate limiting for authenticated users
class UserRateLimiter:
    """User-based rate limiting with subscription tier support."""
    
    SUBSCRIPTION_LIMITS = {
        SubscriptionTier.STARTER: {
            "contracts_per_month": 50,
            "ai_generations_per_day": 10,
            "api_calls_per_hour": 100
        },
        SubscriptionTier.PROFESSIONAL: {
            "contracts_per_month": 200,
            "ai_generations_per_day": 50,
            "api_calls_per_hour": 500
        },
        SubscriptionTier.BUSINESS: {
            "contracts_per_month": 1000,
            "ai_generations_per_day": 200,
            "api_calls_per_hour": 2000
        }
    }
    
    async def check_user_limits(self, user: User, action: str) -> bool:
        """Check if user has exceeded subscription limits."""
        limits = self.SUBSCRIPTION_LIMITS[user.company.subscription_tier]
        
        if action == "contract_creation":
            current_count = await self._get_monthly_contract_count(user)
            return current_count < limits["contracts_per_month"]
        
        elif action == "ai_generation":
            current_count = await self._get_daily_ai_count(user)
            return current_count < limits["ai_generations_per_day"]
        
        return True
```

### SQL Injection Prevention

**ORM Protection**: SQLAlchemy ORM with parameterized queries.

```python
# app/infrastructure/repositories/sqlalchemy_contract_repository.py
class SQLAlchemyContractRepository:
    """Repository with SQL injection protection."""
    
    async def find_contracts_by_search(self, company_id: str, search_term: str) -> List[Contract]:
        """
        Safe text search using parameterized queries:
        - No string concatenation
        - Automatic parameter binding
        - SQL injection prevention
        """
        # SAFE: Using SQLAlchemy ORM with parameters
        query = select(ContractModel).where(
            and_(
                ContractModel.company_id == company_id,  # Parameterized
                or_(
                    ContractModel.title.ilike(f"%{search_term}%"),  # Safe parameter binding
                    ContractModel.client_name.ilike(f"%{search_term}%")
                )
            )
        )
        
        result = await self.db.execute(query)
        return [self._to_domain(model) for model in result.scalars()]
    
    async def get_contracts_by_complex_filter(self, filter_params: Dict[str, Any]) -> List[Contract]:
        """
        Complex filtering with injection protection:
        - Whitelist allowed filter fields
        - Validate parameter types
        - Use SQLAlchemy expression language
        """
        ALLOWED_FILTERS = {
            'contract_type': ContractModel.contract_type,
            'status': ContractModel.status,
            'created_after': ContractModel.created_at,
            'contract_value_min': ContractModel.contract_value
        }
        
        query = select(ContractModel)
        
        for field, value in filter_params.items():
            if field not in ALLOWED_FILTERS:
                raise ValueError(f"Invalid filter field: {field}")
            
            column = ALLOWED_FILTERS[field]
            
            # Type-safe filtering
            if field == 'created_after':
                query = query.where(column >= value)
            elif field == 'contract_value_min':
                query = query.where(column >= float(value))
            else:
                query = query.where(column == value)
        
        result = await self.db.execute(query)
        return [self._to_domain(model) for model in result.scalars()]
```

---

## Infrastructure Security

### Azure Security Configuration

**Network Security**: Azure-managed network protection.

```yaml
# azure-container-app.yaml security configuration
security:
  network:
    allowedIpRanges:
      - "0.0.0.0/0"  # Public access (can be restricted)
    
  ingress:
    external: true
    targetPort: 8000
    transport: http  # HTTPS termination at Azure Front Door
    
  cors:
    allowedOrigins:
      - "https://app.pactoria.com"
      - "https://www.pactoria.com"
    allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allowedHeaders: ["*"]
    allowCredentials: true

# Azure Key Vault integration
secrets:
  - name: database-url
    keyVaultUrl: https://pactoria-kv-prod.vault.azure.net/secrets/DATABASE-URL
    identity: system-assigned
  
  - name: groq-api-key
    keyVaultUrl: https://pactoria-kv-prod.vault.azure.net/secrets/GROQ-API-KEY
    identity: system-assigned
```

**Container Security**: Secure containerization practices.

```dockerfile
# Dockerfile security best practices
FROM python:3.12-slim

# Create non-root user
RUN groupadd -r pactoria && useradd -r -g pactoria pactoria

# Set secure working directory
WORKDIR /app

# Install security updates
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    gcc && \
    rm -rf /var/lib/apt/lists/*

# Copy and install dependencies as root
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=pactoria:pactoria app/ ./app/

# Switch to non-root user
USER pactoria

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Database Security

**Connection Security**: Encrypted connections with certificate validation.

```python
# app/core/database.py
def create_production_engine():
    """Create secure database engine for production."""
    
    connection_params = {
        "echo": False,
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
        
        # Security parameters
        "connect_args": {
            "sslmode": "require",           # Require SSL/TLS
            "sslcert": "/certs/client.crt", # Client certificate
            "sslkey": "/certs/client.key",  # Client private key
            "sslrootcert": "/certs/ca.crt", # CA certificate
            "application_name": "pactoria-backend",
            "connect_timeout": 10
        }
    }
    
    return create_async_engine(settings.DATABASE_URL, **connection_params)
```

**Database Access Control**: Role-based database permissions.

```sql
-- Database security setup
CREATE ROLE pactoria_app_role;

-- Grant minimum required permissions
GRANT CONNECT ON DATABASE pactoria_prod TO pactoria_app_role;
GRANT USAGE ON SCHEMA public TO pactoria_app_role;

-- Table-specific permissions
GRANT SELECT, INSERT, UPDATE ON contracts TO pactoria_app_role;
GRANT SELECT, INSERT, UPDATE ON users TO pactoria_app_role;
GRANT SELECT, INSERT, UPDATE ON companies TO pactoria_app_role;
GRANT SELECT ON templates TO pactoria_app_role;  -- Read-only

-- Audit table - insert only
GRANT INSERT ON audit_logs TO pactoria_app_role;

-- Sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO pactoria_app_role;

-- Create application user
CREATE USER pactoria_app WITH PASSWORD 'secure-generated-password';
GRANT pactoria_app_role TO pactoria_app;
```

---

## UK Legal Compliance

### GDPR Compliance Implementation

**Data Subject Rights**: Complete implementation of GDPR requirements.

```python
# app/services/gdpr_service.py
class GDPRComplianceService:
    """Handle GDPR data subject rights and compliance."""
    
    async def handle_data_access_request(self, user_email: str) -> Dict[str, Any]:
        """
        GDPR Article 15 - Right of Access
        Provide comprehensive data export within 30 days.
        """
        user = await self.user_repository.find_by_email(user_email)
        if not user:
            raise ValueError("User not found")
        
        # Gather all personal data
        personal_data = {
            "user_profile": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat(),
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
                "timezone": user.timezone,
                "notification_preferences": user.notification_preferences
            },
            
            "contracts": [],
            "audit_logs": [],
            "ai_interactions": []
        }
        
        # Get user's contracts
        contracts = await self.contract_repository.find_by_user(user.id)
        for contract in contracts:
            personal_data["contracts"].append({
                "id": contract.id,
                "title": contract.title,
                "created_at": contract.created_at.isoformat(),
                "status": contract.status.value,
                # Note: Sensitive content may be excluded based on legal basis
            })
        
        # Get audit trail (last 2 years)
        cutoff_date = datetime.utcnow() - timedelta(days=730)
        audit_logs = await self.audit_repository.find_by_user_since(user.id, cutoff_date)
        
        for log in audit_logs:
            personal_data["audit_logs"].append({
                "timestamp": log.timestamp.isoformat(),
                "event_type": log.event_type,
                "resource_type": log.resource_type,
                "ip_address": log.ip_address  # May be masked for privacy
            })
        
        return personal_data
    
    async def handle_data_erasure_request(self, user_email: str, erasure_reason: str) -> bool:
        """
        GDPR Article 17 - Right to Erasure ("Right to be Forgotten")
        Securely delete personal data while maintaining business records.
        """
        user = await self.user_repository.find_by_email(user_email)
        if not user:
            return False
        
        # Check if erasure is legally permissible
        if await self._has_legal_retention_obligation(user):
            raise GDPRError("Data cannot be erased due to legal retention obligations")
        
        # Create erasure audit record before deletion
        await self.audit_repository.create_erasure_record(
            user_id=user.id,
            erasure_reason=erasure_reason,
            data_categories=["user_profile", "preferences", "non_essential_logs"]
        )
        
        # Pseudonymize instead of delete if business records must be retained
        await self._pseudonymize_user_data(user)
        
        return True
    
    async def handle_data_portability_request(self, user_email: str) -> bytes:
        """
        GDPR Article 20 - Right to Data Portability
        Export data in machine-readable format (JSON).
        """
        data = await self.handle_data_access_request(user_email)
        
        # Format for portability
        portable_data = {
            "export_metadata": {
                "export_date": datetime.utcnow().isoformat(),
                "format": "JSON",
                "gdpr_legal_basis": "Article 20 - Data Portability",
                "contact": "privacy@pactoria.com"
            },
            "personal_data": data
        }
        
        return json.dumps(portable_data, indent=2).encode('utf-8')
```

**Consent Management**: Explicit consent tracking and management.

```python
# app/models/gdpr.py
class ConsentRecord(Base):
    """Track GDPR consent with legal requirements."""
    __tablename__ = "consent_records"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Consent details
    purpose = Column(String, nullable=False)      # Data processing purpose
    legal_basis = Column(String, nullable=False)  # GDPR legal basis
    consent_given = Column(Boolean, nullable=False)
    consent_text = Column(Text, nullable=False)   # Exact consent text shown
    
    # Tracking
    consent_date = Column(DateTime(timezone=True), server_default=func.now())
    consent_method = Column(String, nullable=False)  # web_form, api, etc.
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    # Withdrawal
    withdrawn_at = Column(DateTime(timezone=True), nullable=True)
    withdrawal_reason = Column(String, nullable=True)

class GDPRConsentManager:
    """Manage GDPR consent lifecycle."""
    
    PROCESSING_PURPOSES = {
        "contract_management": "Processing contract data for service delivery",
        "ai_analysis": "AI-powered contract analysis and generation",
        "marketing": "Marketing communications and product updates",
        "analytics": "Service improvement and analytics"
    }
    
    async def record_consent(self, user_id: str, purpose: str, consent_given: bool, 
                           context: Dict[str, Any]) -> ConsentRecord:
        """Record user consent with full audit trail."""
        
        consent_record = ConsentRecord(
            user_id=user_id,
            purpose=purpose,
            legal_basis="consent" if consent_given else "withdrawn",
            consent_given=consent_given,
            consent_text=self.PROCESSING_PURPOSES.get(purpose, ""),
            consent_method=context.get("method", "web_form"),
            ip_address=context.get("ip_address"),
            user_agent=context.get("user_agent")
        )
        
        await self.db.merge(consent_record)
        await self.db.commit()
        
        return consent_record
    
    async def check_valid_consent(self, user_id: str, purpose: str) -> bool:
        """Check if user has valid consent for data processing purpose."""
        
        latest_consent = await self.db.query(ConsentRecord)\
            .filter(ConsentRecord.user_id == user_id)\
            .filter(ConsentRecord.purpose == purpose)\
            .order_by(ConsentRecord.consent_date.desc())\
            .first()
        
        if not latest_consent:
            return False
        
        return latest_consent.consent_given and latest_consent.withdrawn_at is None
```

### Data Protection Impact Assessment (DPIA)

**Automated DPIA**: Risk assessment for data processing activities.

```python
# app/services/dpia_service.py
class DPIAService:
    """Data Protection Impact Assessment automation."""
    
    def assess_processing_risk(self, processing_activity: Dict[str, Any]) -> Dict[str, Any]:
        """
        Automated DPIA based on UK GDPR requirements:
        - High risk processing identification
        - Risk mitigation recommendations  
        - Compliance verification
        """
        risk_factors = {
            "special_category_data": False,
            "large_scale_processing": False,
            "automated_decision_making": True,  # AI analysis
            "vulnerable_data_subjects": False,
            "novel_technology": True,           # AI/ML
            "cross_border_transfer": False
        }
        
        # Calculate overall risk score
        high_risk_count = sum(1 for factor in risk_factors.values() if factor)
        
        risk_level = "HIGH" if high_risk_count >= 2 else "MEDIUM" if high_risk_count == 1 else "LOW"
        
        return {
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "dpia_required": risk_level == "HIGH",
            "mitigation_measures": self._get_mitigation_measures(risk_factors),
            "compliance_status": self._assess_compliance(risk_factors)
        }
    
    def _get_mitigation_measures(self, risk_factors: Dict[str, bool]) -> List[str]:
        """Recommend specific mitigation measures."""
        measures = [
            "Regular security audits and penetration testing",
            "Encryption of sensitive data at rest and in transit",
            "Access controls and user authentication",
            "Data minimization and retention policies"
        ]
        
        if risk_factors["automated_decision_making"]:
            measures.extend([
                "Human oversight of AI decisions",
                "Right to explanation for automated decisions",
                "Algorithm bias testing and monitoring"
            ])
        
        if risk_factors["novel_technology"]:
            measures.extend([
                "Privacy by design implementation",
                "Regular technology risk assessments",
                "Staff training on new technology risks"
            ])
        
        return measures
```

---

## Threat Mitigation

### Common Attack Vectors

**Cross-Site Scripting (XSS) Prevention**:

```python
# app/middleware/security.py
import html
import re

class XSSProtectionMiddleware:
    """Comprehensive XSS protection."""
    
    def __init__(self):
        self.dangerous_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'vbscript:',
            r'on\w+\s*=',
            r'<iframe[^>]*>.*?</iframe>',
            r'<object[^>]*>.*?</object>'
        ]
    
    def sanitize_input(self, data: str) -> str:
        """Sanitize user input to prevent XSS attacks."""
        if not data:
            return data
        
        # HTML encode special characters
        sanitized = html.escape(data)
        
        # Remove dangerous patterns
        for pattern in self.dangerous_patterns:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
        
        return sanitized
    
    async def process_request(self, request: Request) -> Request:
        """Sanitize all request data."""
        if request.method in ["POST", "PUT", "PATCH"]:
            # Sanitize JSON body
            if hasattr(request, '_body'):
                body = await request.body()
                try:
                    json_data = json.loads(body)
                    sanitized_data = self._deep_sanitize(json_data)
                    request._body = json.dumps(sanitized_data).encode()
                except json.JSONDecodeError:
                    pass
        
        return request
    
    def _deep_sanitize(self, obj) -> Any:
        """Recursively sanitize nested data structures."""
        if isinstance(obj, dict):
            return {k: self._deep_sanitize(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._deep_sanitize(item) for item in obj]
        elif isinstance(obj, str):
            return self.sanitize_input(obj)
        else:
            return obj
```

**Cross-Site Request Forgery (CSRF) Protection**:

```python
# app/middleware/csrf.py
class CSRFProtectionMiddleware:
    """CSRF protection for state-changing operations."""
    
    def __init__(self):
        self.csrf_exempt_paths = ["/api/v1/auth/login", "/api/v1/auth/register"]
        self.state_changing_methods = ["POST", "PUT", "PATCH", "DELETE"]
    
    async def __call__(self, request: Request, call_next):
        """Validate CSRF token for state-changing operations."""
        
        if (request.method in self.state_changing_methods and 
            request.url.path not in self.csrf_exempt_paths):
            
            # Extract CSRF token from header
            csrf_token = request.headers.get("X-CSRF-Token")
            if not csrf_token:
                return JSONResponse(
                    status_code=403,
                    content={"error": "CSRF token required"}
                )
            
            # Validate CSRF token
            if not self._validate_csrf_token(csrf_token, request):
                return JSONResponse(
                    status_code=403,
                    content={"error": "Invalid CSRF token"}
                )
        
        response = await call_next(request)
        
        # Set CSRF token cookie for GET requests
        if request.method == "GET":
            csrf_token = self._generate_csrf_token()
            response.set_cookie(
                "csrf_token", 
                csrf_token,
                httponly=True,
                secure=settings.ENVIRONMENT == "production",
                samesite="strict"
            )
        
        return response
```

### Brute Force Protection

**Account Lockout**: Prevent password brute force attacks.

```python
# app/services/security_service.py
class BruteForceProtection:
    """Protect against brute force authentication attacks."""
    
    def __init__(self):
        self.max_attempts = 5
        self.lockout_duration = 900  # 15 minutes
        self.redis_client = redis.Redis(host=settings.REDIS_HOST)
    
    async def record_failed_attempt(self, identifier: str) -> None:
        """Record failed login attempt."""
        key = f"failed_attempts:{identifier}"
        
        # Increment counter with expiration
        pipe = self.redis_client.pipeline()
        pipe.incr(key)
        pipe.expire(key, self.lockout_duration)
        results = pipe.execute()
        
        attempt_count = results[0]
        
        if attempt_count >= self.max_attempts:
            # Lock account
            await self._lock_account(identifier)
            
            # Log security event
            security_monitor.record_security_event(
                "brute_force_detected",
                "high",
                {
                    "identifier": identifier,
                    "attempt_count": attempt_count,
                    "lockout_duration": self.lockout_duration
                }
            )
    
    async def is_locked(self, identifier: str) -> bool:
        """Check if account is locked due to brute force attempts."""
        attempts = self.redis_client.get(f"failed_attempts:{identifier}")
        return attempts and int(attempts) >= self.max_attempts
    
    async def clear_failed_attempts(self, identifier: str) -> None:
        """Clear failed attempts after successful login."""
        self.redis_client.delete(f"failed_attempts:{identifier}")
```

---

## Security Monitoring

### Real-time Security Monitoring

```python
# app/services/security_monitor.py
class SecurityMonitor:
    """Real-time security monitoring and alerting."""
    
    def __init__(self):
        self.security_events = []
        self.alert_thresholds = {
            "failed_logins": 10,        # per 5 minutes
            "rate_limit_hits": 50,      # per 10 minutes  
            "csrf_failures": 5,         # per minute
            "xss_attempts": 1,          # immediate alert
            "sql_injection_attempts": 1  # immediate alert
        }
    
    def record_security_event(self, event_type: str, severity: str, 
                            details: Dict[str, Any], user_id: str = None) -> None:
        """Record and analyze security events."""
        
        event = SecurityEvent(
            id=str(uuid.uuid4()),
            event_type=event_type,
            severity=severity,  # low, medium, high, critical
            details=details,
            user_id=user_id,
            timestamp=datetime.utcnow(),
            source_ip=details.get('ip_address'),
            user_agent=details.get('user_agent')
        )
        
        # Store event
        self.security_events.append(event)
        
        # Real-time analysis
        asyncio.create_task(self._analyze_event(event))
        
        # Immediate alerting for critical events
        if severity == "critical":
            asyncio.create_task(self._send_immediate_alert(event))
    
    async def _analyze_event(self, event: SecurityEvent) -> None:
        """Analyze event for patterns and anomalies."""
        
        # Pattern detection
        recent_events = await self._get_recent_events(
            event_type=event.event_type,
            time_window=300  # 5 minutes
        )
        
        if len(recent_events) >= self.alert_thresholds.get(event.event_type, 100):
            await self._trigger_pattern_alert(event.event_type, recent_events)
        
        # IP-based analysis
        if event.source_ip:
            ip_events = await self._get_events_by_ip(event.source_ip, time_window=600)
            if len(ip_events) > 20:  # Suspicious activity from single IP
                await self._trigger_ip_alert(event.source_ip, ip_events)
    
    async def _trigger_pattern_alert(self, event_type: str, events: List[SecurityEvent]) -> None:
        """Trigger alert for detected attack patterns."""
        
        alert = SecurityAlert(
            id=str(uuid.uuid4()),
            alert_type=f"pattern_detected_{event_type}",
            severity="high",
            message=f"Detected {len(events)} {event_type} events in 5 minutes",
            events=events,
            created_at=datetime.utcnow()
        )
        
        # Send to security team
        await self._send_security_alert(alert)
        
        # Auto-mitigation for high-risk patterns
        if event_type in ["sql_injection_attempts", "xss_attempts"]:
            await self._activate_emergency_protection()
    
    async def get_security_dashboard(self, hours: int = 24) -> Dict[str, Any]:
        """Generate security dashboard data."""
        
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        recent_events = [e for e in self.security_events if e.timestamp >= cutoff]
        
        return {
            "total_events": len(recent_events),
            "events_by_type": self._count_by_field(recent_events, "event_type"),
            "events_by_severity": self._count_by_field(recent_events, "severity"),
            "top_source_ips": self._get_top_source_ips(recent_events),
            "attack_trends": self._calculate_attack_trends(recent_events),
            "mitigation_status": self._get_mitigation_status()
        }
```

### Automated Incident Response

```python
# app/services/incident_response.py
class AutomatedIncidentResponse:
    """Automated security incident response system."""
    
    RESPONSE_PLAYBOOKS = {
        "brute_force_attack": {
            "actions": ["block_ip", "notify_security_team", "increase_monitoring"],
            "auto_execute": True
        },
        "sql_injection_attempt": {
            "actions": ["block_ip", "emergency_alert", "isolate_affected_systems"],
            "auto_execute": True
        },
        "data_breach_suspected": {
            "actions": ["emergency_alert", "preserve_evidence", "notify_dpo"],
            "auto_execute": False,  # Requires human authorization
            "escalation_required": True
        }
    }
    
    async def respond_to_incident(self, incident_type: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute automated incident response."""
        
        playbook = self.RESPONSE_PLAYBOOKS.get(incident_type)
        if not playbook:
            return {"error": "No playbook found for incident type"}
        
        response_log = {
            "incident_type": incident_type,
            "timestamp": datetime.utcnow().isoformat(),
            "context": context,
            "actions_taken": []
        }
        
        for action in playbook["actions"]:
            try:
                result = await self._execute_response_action(action, context)
                response_log["actions_taken"].append({
                    "action": action,
                    "status": "success",
                    "result": result
                })
            except Exception as e:
                response_log["actions_taken"].append({
                    "action": action,
                    "status": "failed",
                    "error": str(e)
                })
        
        # Escalate if required
        if playbook.get("escalation_required"):
            await self._escalate_to_human(incident_type, response_log)
        
        return response_log
    
    async def _execute_response_action(self, action: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute specific response action."""
        
        if action == "block_ip":
            ip_address = context.get("source_ip")
            if ip_address:
                await self._block_ip_address(ip_address, duration=3600)  # 1 hour
                return {"blocked_ip": ip_address, "duration": "1 hour"}
        
        elif action == "emergency_alert":
            await self._send_emergency_alert(context)
            return {"alert_sent": True}
        
        elif action == "notify_dpo":
            # Data Protection Officer notification for GDPR compliance
            await self._notify_data_protection_officer(context)
            return {"dpo_notified": True}
        
        elif action == "preserve_evidence":
            evidence_id = await self._preserve_digital_evidence(context)
            return {"evidence_preserved": evidence_id}
        
        return {"action_completed": True}
```

This comprehensive security documentation covers all aspects of the Pactoria backend security architecture, ensuring robust protection for UK SME contract data while maintaining full regulatory compliance.