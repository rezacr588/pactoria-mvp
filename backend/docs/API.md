# API Documentation

**Pactoria MVP Backend - Complete REST API Reference**

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Contract Management API](#contract-management-api)
4. [AI Services API](#ai-services-api)
5. [Analytics API](#analytics-api)
6. [Security & Audit API](#security--audit-api)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Frontend Integration Examples](#frontend-integration-examples)

---

## Overview

The Pactoria API is a RESTful service designed for AI-powered contract management. All endpoints return JSON and follow consistent patterns for request/response structures.

### Base Configuration

```bash
# Development
Base URL: http://localhost:8000
API Version: v1
Content-Type: application/json
Authentication: Bearer JWT tokens
```

### Common Response Structure

```json
{
  "data": { ... },           // Successful response data
  "message": "Success",      // Human-readable message
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### Error Response Structure

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "title",
      "constraint": "Title must be between 1 and 200 characters"
    }
  },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

---

## Authentication

All API endpoints except health checks require JWT authentication.

### User Registration

**Endpoint:** `POST /api/v1/auth/register`

**Description:** Register new user with company creation

**Request Body:**
```json
{
  "email": "john.doe@company.co.uk",
  "full_name": "John Doe",
  "password": "SecurePassword123!",
  "company_name": "Acme Limited",
  "timezone": "Europe/London",
  "phone": "+44 20 7123 4567"
}
```

**Response:** `201 Created`
```json
{
  "token": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 86400
  },
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@company.co.uk",
    "full_name": "John Doe",
    "is_active": true,
    "company_id": "550e8400-e29b-41d4-a716-446655440001",
    "created_at": "2025-01-01T12:00:00Z"
  },
  "company": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Acme Limited",
    "subscription_tier": "starter",
    "max_users": 5,
    "users_count": 1
  }
}
```

**Business Rules:**
- Email must be unique across the system
- Password must meet security requirements (8+ chars, uppercase, lowercase, number)
- Company name must be unique
- Automatically creates STARTER subscription with 5 user limit

### User Login

**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "email": "john.doe@company.co.uk",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "token": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 86400
  },
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@company.co.uk",
    "full_name": "John Doe",
    "company_id": "550e8400-e29b-41d4-a716-446655440001",
    "last_login": "2025-01-01T12:00:00Z"
  }
}
```

### Get Current User

**Endpoint:** `GET /api/v1/auth/me`

**Headers:** `Authorization: Bearer {jwt_token}`

**Response:** `200 OK`
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@company.co.uk",
    "full_name": "John Doe",
    "is_active": true,
    "company": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Acme Limited",
      "subscription_tier": "starter"
    }
  }
}
```

---

## Contract Management API

### Create Contract

**Endpoint:** `POST /api/v1/contracts/`

**Headers:** `Authorization: Bearer {jwt_token}`

**Request Body:**
```json
{
  "title": "Professional Services Agreement - Q1 2025",
  "contract_type": "service_agreement",
  "plain_english_input": "I need a contract for 3 months of web development consulting services. The client is Acme Ltd, payment is £15,000 total, work starts January 1st and ends March 31st. Include standard terms for intellectual property and confidentiality.",
  "client_name": "Acme Limited",
  "client_email": "procurement@acme.co.uk",
  "supplier_name": "Tech Consulting Ltd",
  "contract_value": 15000.00,
  "currency": "GBP",
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-03-31T23:59:59Z",
  "template_id": "template-service-professional"
}
```

**Response:** `201 Created`
```json
{
  "contract": {
    "id": "contract-550e8400-e29b-41d4-a716-446655440002",
    "title": "Professional Services Agreement - Q1 2025",
    "contract_type": "service_agreement",
    "status": "draft",
    "plain_english_input": "I need a contract for 3 months...",
    "client_name": "Acme Limited",
    "client_email": "procurement@acme.co.uk",
    "contract_value": 15000.00,
    "currency": "GBP",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-03-31T23:59:59Z",
    "version": 1,
    "is_current_version": true,
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:00:00Z",
    "created_by": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe"
    }
  }
}
```

### List Contracts

**Endpoint:** `GET /api/v1/contracts/`

**Headers:** `Authorization: Bearer {jwt_token}`

**Query Parameters:**
- `page`: Page number (default: 1)
- `size`: Page size (1-100, default: 10)
- `contract_type`: Filter by contract type
- `status`: Filter by status (`draft`, `active`, `completed`, `terminated`)
- `search`: Text search in title, client, supplier
- `sort_by`: Sort field (`created_at`, `title`, `contract_value`)
- `sort_order`: Sort direction (`asc`, `desc`)

**Example:** `GET /api/v1/contracts/?page=1&size=20&status=active&search=Acme`

**Response:** `200 OK`
```json
{
  "contracts": [
    {
      "id": "contract-550e8400-e29b-41d4-a716-446655440002",
      "title": "Professional Services Agreement - Q1 2025",
      "contract_type": "service_agreement",
      "status": "active",
      "client_name": "Acme Limited",
      "contract_value": 15000.00,
      "currency": "GBP",
      "start_date": "2025-01-01T00:00:00Z",
      "end_date": "2025-03-31T23:59:59Z",
      "created_at": "2025-01-01T12:00:00Z",
      "compliance_score": {
        "overall_score": 0.94,
        "is_compliant": true
      }
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "size": 20,
    "pages": 3,
    "has_next": true,
    "has_previous": false
  }
}
```

### Get Contract by ID

**Endpoint:** `GET /api/v1/contracts/{contract_id}`

**Headers:** `Authorization: Bearer {jwt_token}`

**Response:** `200 OK`
```json
{
  "contract": {
    "id": "contract-550e8400-e29b-41d4-a716-446655440002",
    "title": "Professional Services Agreement - Q1 2025",
    "contract_type": "service_agreement",
    "status": "active",
    "plain_english_input": "I need a contract for 3 months...",
    "generated_content": "PROFESSIONAL SERVICES AGREEMENT\n\nThis Agreement...",
    "final_content": "PROFESSIONAL SERVICES AGREEMENT\n\nThis Agreement...",
    "client_name": "Acme Limited",
    "client_email": "procurement@acme.co.uk",
    "contract_value": 15000.00,
    "currency": "GBP",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-03-31T23:59:59Z",
    "version": 2,
    "compliance_score": {
      "overall_score": 0.94,
      "gdpr_compliance": 0.96,
      "employment_law_compliance": 0.91,
      "consumer_rights_compliance": 0.95,
      "is_compliant": true,
      "analysis_date": "2025-01-01T12:10:00Z"
    },
    "risk_assessment": {
      "risk_score": 3,
      "risk_level": "low",
      "risk_factors": [
        "Consider adding liability caps",
        "Clarify data retention periods"
      ]
    },
    "ai_generation": {
      "id": "ai-gen-550e8400-e29b-41d4-a716-446655440003",
      "model_name": "openai/gpt-oss-120b",
      "processing_time_ms": 2347.5,
      "confidence_score": 0.94,
      "created_at": "2025-01-01T12:05:30Z"
    },
    "versions": [
      {
        "version": 1,
        "created_at": "2025-01-01T12:00:00Z",
        "changes": "Initial creation"
      },
      {
        "version": 2,
        "created_at": "2025-01-01T12:10:00Z",
        "changes": "Added compliance analysis"
      }
    ],
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:10:00Z"
  }
}
```

### Update Contract

**Endpoint:** `PUT /api/v1/contracts/{contract_id}`

**Headers:** `Authorization: Bearer {jwt_token}`

**Request Body:** (partial updates allowed)
```json
{
  "title": "Updated Professional Services Agreement",
  "contract_value": 18000.00,
  "end_date": "2025-04-15T23:59:59Z"
}
```

**Response:** `200 OK`
```json
{
  "contract": {
    "id": "contract-550e8400-e29b-41d4-a716-446655440002",
    "title": "Updated Professional Services Agreement",
    "contract_value": 18000.00,
    "end_date": "2025-04-15T23:59:59Z",
    "version": 3,
    "updated_at": "2025-01-01T14:30:00Z"
  }
}
```

---

## AI Services API

### Generate Contract Content

**Endpoint:** `POST /api/v1/contracts/{contract_id}/generate`

**Headers:** `Authorization: Bearer {jwt_token}`

**Request Body:**
```json
{
  "regenerate": false,
  "include_clauses": [
    "intellectual_property",
    "confidentiality",
    "termination"
  ],
  "legal_preferences": {
    "jurisdiction": "england_wales",
    "dispute_resolution": "mediation_arbitration",
    "governing_law": "english_law"
  }
}
```

**Response:** `200 OK`
```json
{
  "ai_generation": {
    "id": "ai-gen-550e8400-e29b-41d4-a716-446655440003",
    "model_name": "openai/gpt-oss-120b",
    "generated_content": "PROFESSIONAL SERVICES AGREEMENT\n\nThis Agreement is made this 1st day of January, 2025, between:\n\nCLIENT: Acme Limited, a company registered in England and Wales...",
    "processing_time_ms": 2347.5,
    "token_usage": {
      "prompt_tokens": 245,
      "completion_tokens": 1823,
      "total_tokens": 2068
    },
    "confidence_score": 0.94,
    "generation_metadata": {
      "template_used": "template-service-professional",
      "uk_legal_compliance": true,
      "clauses_included": [
        "payment_terms",
        "intellectual_property",
        "confidentiality",
        "termination",
        "dispute_resolution",
        "gdpr_compliance"
      ]
    },
    "created_at": "2025-01-01T12:05:30Z"
  },
  "contract_updated": {
    "version": 2,
    "status": "draft",
    "has_generated_content": true
  }
}
```

### Analyze Contract Compliance

**Endpoint:** `POST /api/v1/contracts/{contract_id}/analyze`

**Headers:** `Authorization: Bearer {jwt_token}`

**Request Body:**
```json
{
  "force_reanalysis": false,
  "compliance_areas": [
    "gdpr",
    "employment_law",
    "consumer_rights",
    "commercial_terms"
  ]
}
```

**Response:** `200 OK`
```json
{
  "compliance_analysis": {
    "id": "compliance-550e8400-e29b-41d4-a716-446655440004",
    "contract_id": "contract-550e8400-e29b-41d4-a716-446655440002",
    "overall_score": 0.94,
    "is_compliant": true,
    "compliance_breakdown": {
      "gdpr_compliance": {
        "score": 0.96,
        "status": "compliant",
        "findings": [
          "Data processing clauses present",
          "Subject rights clearly defined",
          "Breach notification procedures included"
        ]
      },
      "employment_law_compliance": {
        "score": 0.91,
        "status": "compliant",
        "findings": [
          "Working time regulations addressed",
          "Holiday entitlement specified",
          "Notice periods comply with UK law"
        ]
      },
      "consumer_rights_compliance": {
        "score": 0.95,
        "status": "compliant",
        "findings": [
          "Consumer protection clauses present",
          "Fair trading terms included",
          "Cooling-off period specified"
        ]
      },
      "commercial_terms_compliance": {
        "score": 0.93,
        "status": "compliant",
        "findings": [
          "Payment terms clearly defined",
          "Liability limitations appropriate",
          "Termination clauses comprehensive"
        ]
      }
    },
    "risk_assessment": {
      "risk_score": 3,
      "risk_level": "low",
      "risk_factors": [
        "Consider adding liability caps for professional services",
        "Clarify data retention periods for GDPR compliance",
        "Specify intellectual property ownership more clearly"
      ],
      "recommendations": [
        "Add explicit GDPR data processing schedule",
        "Include standard UK termination notice requirements",
        "Consider professional indemnity insurance requirements"
      ]
    },
    "analysis_metadata": {
      "model_name": "openai/gpt-oss-120b",
      "processing_time_ms": 1847.3,
      "analysis_version": "2.1",
      "uk_legal_framework": "2025.1"
    },
    "analysis_date": "2025-01-01T12:10:45Z"
  }
}
```

### AI Health Check

**Endpoint:** `GET /api/v1/ai/health`

**Headers:** `Authorization: Bearer {jwt_token}`

**Response:** `200 OK`
```json
{
  "ai_service": {
    "status": "healthy",
    "model": {
      "name": "openai/gpt-oss-120b",
      "version": "2024.12",
      "parameters": "120B"
    },
    "features": [
      "contract_generation",
      "compliance_validation",
      "risk_assessment",
      "template_recommendation"
    ],
    "performance": {
      "average_response_time_ms": 1200,
      "success_rate": 0.998,
      "uptime_percentage": 99.9
    },
    "capabilities": {
      "max_tokens": 4096,
      "supported_languages": ["english"],
      "legal_systems": ["uk", "england_wales", "scotland", "northern_ireland"]
    }
  }
}
```

---

## Analytics API

### Business Metrics

**Endpoint:** `GET /api/v1/analytics/business`

**Headers:** `Authorization: Bearer {jwt_token}`

**Response:** `200 OK`
```json
{
  "business_metrics": {
    "contract_metrics": {
      "total_contracts": 127,
      "active_contracts": 45,
      "draft_contracts": 23,
      "completed_contracts": 59,
      "contract_growth_rate": 23.5
    },
    "financial_metrics": {
      "total_contract_value": 1234567.89,
      "currency": "GBP",
      "average_contract_value": 9721.00,
      "largest_contract_value": 85000.00,
      "monthly_recurring_value": 45600.00
    },
    "compliance_metrics": {
      "average_compliance_score": 0.94,
      "compliant_contracts_percentage": 96.8,
      "high_risk_contracts": 3,
      "compliance_improvement_rate": 5.2
    },
    "performance_metrics": {
      "average_generation_time_seconds": 12.3,
      "average_analysis_time_seconds": 8.7,
      "user_satisfaction_rating": 4.7,
      "time_savings_hours_per_week": 6.8
    },
    "user_engagement": {
      "active_users_monthly": 23,
      "contracts_per_user_monthly": 2.8,
      "login_frequency_weekly": 4.2,
      "feature_usage": {
        "ai_generation": 0.89,
        "compliance_analysis": 0.76,
        "template_usage": 0.92
      }
    },
    "data_updated": "2025-01-01T12:00:00Z",
    "reporting_period": {
      "start": "2024-12-01T00:00:00Z",
      "end": "2025-01-01T00:00:00Z",
      "period_type": "monthly"
    }
  }
}
```

### Compliance Analytics

**Endpoint:** `GET /api/v1/analytics/compliance`

**Headers:** `Authorization: Bearer {jwt_token}`

**Query Parameters:**
- `period`: Time period (`7d`, `30d`, `90d`, `1y`)
- `compliance_area`: Specific area (`gdpr`, `employment_law`, `consumer_rights`)

**Response:** `200 OK`
```json
{
  "compliance_analytics": {
    "summary": {
      "overall_compliance_rate": 0.94,
      "total_analyses_performed": 234,
      "improvement_trend": "positive",
      "compliance_goal_achievement": 0.98
    },
    "compliance_areas": {
      "gdpr_compliance": {
        "average_score": 0.96,
        "contracts_analyzed": 234,
        "compliant_percentage": 98.3,
        "common_issues": [
          "Data retention periods not specified (12%)",
          "Subject access procedures unclear (8%)"
        ]
      },
      "employment_law_compliance": {
        "average_score": 0.91,
        "contracts_analyzed": 156,
        "compliant_percentage": 94.2,
        "common_issues": [
          "Holiday entitlement calculation unclear (15%)",
          "Notice periods not UK-compliant (11%)"
        ]
      },
      "consumer_rights_compliance": {
        "average_score": 0.95,
        "contracts_analyzed": 189,
        "compliant_percentage": 97.1,
        "common_issues": [
          "Cooling-off period not specified (8%)",
          "Refund policy unclear (6%)"
        ]
      }
    },
    "risk_distribution": {
      "low_risk": 189,
      "medium_risk": 38,
      "high_risk": 7,
      "critical_risk": 0
    },
    "trends": {
      "monthly_improvement": 0.03,
      "compliance_score_trend": [
        {"month": "2024-10", "score": 0.89},
        {"month": "2024-11", "score": 0.92},
        {"month": "2024-12", "score": 0.94}
      ]
    }
  }
}
```

---

## Security & Audit API

### Audit Logs

**Endpoint:** `GET /api/v1/security/audit-logs`

**Headers:** `Authorization: Bearer {jwt_token}`

**Query Parameters:**
- `page`: Page number (default: 1)
- `size`: Page size (1-100, default: 50)
- `event_type`: Filter by event type
- `resource_type`: Filter by resource type
- `hours`: Time window in hours (default: 168 = 1 week)

**Response:** `200 OK`
```json
{
  "audit_logs": [
    {
      "id": "audit-550e8400-e29b-41d4-a716-446655440005",
      "event_type": "contract_created",
      "resource_type": "contract",
      "resource_id": "contract-550e8400-e29b-41d4-a716-446655440002",
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "email": "john.doe@company.co.uk"
      },
      "changes": {
        "old_values": null,
        "new_values": {
          "title": "Professional Services Agreement - Q1 2025",
          "status": "draft",
          "contract_type": "service_agreement"
        }
      },
      "context": {
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0 (Chrome/91.0.4472.124)",
        "session_id": "sess-550e8400-e29b-41d4-a716-446655440006"
      },
      "timestamp": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 1247,
    "page": 1,
    "size": 50,
    "pages": 25
  }
}
```

### GDPR Data Request

**Endpoint:** `POST /api/v1/security/gdpr/data-request`

**Headers:** `Authorization: Bearer {jwt_token}`

**Request Body:**
```json
{
  "request_type": "access",
  "user_email": "john.doe@company.co.uk",
  "reason": "User requested data export for personal records"
}
```

**Request Types:**
- `access`: Data portability request
- `portability`: Export user data in structured format
- `erasure`: Right to be forgotten (delete all user data)
- `rectification`: Request to correct user data

**Response:** `202 Accepted`
```json
{
  "gdpr_request": {
    "id": "gdpr-req-550e8400-e29b-41d4-a716-446655440007",
    "request_type": "access",
    "status": "processing",
    "estimated_completion": "2025-01-01T18:00:00Z",
    "legal_basis": "GDPR Article 15 - Right of access",
    "processing_details": {
      "data_sources": ["contracts", "user_profiles", "audit_logs"],
      "estimated_records": 247,
      "export_format": "JSON"
    },
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

---

## Error Handling

### Common HTTP Status Codes

```http
200 OK                    # Successful request
201 Created              # Resource created successfully
202 Accepted             # Request accepted for processing
400 Bad Request          # Invalid request data
401 Unauthorized         # Authentication required
403 Forbidden           # Insufficient permissions
404 Not Found           # Resource doesn't exist
409 Conflict            # Resource conflict (e.g., duplicate email)
422 Unprocessable Entity # Validation failed
429 Too Many Requests   # Rate limit exceeded
500 Internal Server Error # Server error
503 Service Unavailable  # Temporary service interruption
```

### Error Response Examples

**Validation Error (422):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "contract_value",
        "message": "Contract value must be positive",
        "value": -1000
      },
      {
        "field": "end_date",
        "message": "End date must be after start date",
        "value": "2024-12-31T23:59:59Z"
      }
    ]
  },
  "timestamp": "2025-01-01T12:00:00Z",
  "path": "/api/v1/contracts/",
  "method": "POST"
}
```

**Business Rule Violation (400):**
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Cannot modify completed contract",
    "details": {
      "contract_id": "contract-550e8400-e29b-41d4-a716-446655440002",
      "current_status": "completed",
      "allowed_operations": ["view", "export"]
    }
  },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

**AI Service Error (503):**
```json
{
  "error": {
    "code": "AI_SERVICE_UNAVAILABLE",
    "message": "AI service is temporarily unavailable",
    "details": {
      "service": "groq_api",
      "retry_after": 300,
      "fallback_options": [
        "Use existing template",
        "Create contract manually",
        "Retry in 5 minutes"
      ]
    }
  },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

---

## Rate Limiting

The API implements rate limiting to ensure fair usage and system stability:

```http
# Rate Limit Headers (included in all responses)
X-RateLimit-Limit: 100        # Requests per window
X-RateLimit-Remaining: 95      # Remaining requests
X-RateLimit-Reset: 1640995200  # Reset time (Unix timestamp)
X-RateLimit-Window: 3600       # Window duration in seconds
```

### Rate Limits by Endpoint Category

```python
# Authentication endpoints
/api/v1/auth/*: 10 requests per minute

# Contract CRUD operations  
/api/v1/contracts/*: 100 requests per hour

# AI-powered features
/api/v1/contracts/*/generate: 20 requests per hour
/api/v1/contracts/*/analyze: 50 requests per hour

# Analytics and reporting
/api/v1/analytics/*: 60 requests per hour

# Health checks and status
/health, /ready: No rate limiting
```

---

## Frontend Integration Examples

### React/TypeScript Integration

```typescript
// API Client Configuration
interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

class PactoriaApiClient {
  private config: ApiConfig;
  private authToken?: string;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  setAuthToken(token: string) {
    this.authToken = token;
    this.config.headers['Authorization'] = `Bearer ${token}`;
  }

  async createContract(contractData: ContractCreateRequest): Promise<Contract> {
    const response = await fetch(`${this.config.baseURL}/api/v1/contracts/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      },
      body: JSON.stringify(contractData)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();
    return result.contract;
  }

  async generateContract(contractId: string): Promise<AiGeneration> {
    const response = await fetch(`${this.config.baseURL}/api/v1/contracts/${contractId}/generate`, {
      method: 'POST',
      headers: this.config.headers,
      body: JSON.stringify({ regenerate: false })
    });

    const result = await response.json();
    return result.ai_generation;
  }
}

// React Hook Example
export const useContracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createContract = async (data: ContractCreateRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const newContract = await apiClient.createContract(data);
      setContracts(prev => [newContract, ...prev]);
      return newContract;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { contracts, loading, error, createContract };
};
```

### Vue.js Integration

```javascript
// Vuex Store Module
export const contractsModule = {
  namespaced: true,
  
  state: {
    contracts: [],
    currentContract: null,
    loading: false,
    error: null
  },

  mutations: {
    SET_LOADING(state, loading) {
      state.loading = loading;
    },
    SET_CONTRACTS(state, contracts) {
      state.contracts = contracts;
    },
    ADD_CONTRACT(state, contract) {
      state.contracts.unshift(contract);
    },
    SET_ERROR(state, error) {
      state.error = error;
    }
  },

  actions: {
    async createContract({ commit }, contractData) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      
      try {
        const response = await this.$http.post('/api/v1/contracts/', contractData);
        const contract = response.data.contract;
        commit('ADD_CONTRACT', contract);
        return contract;
      } catch (error) {
        commit('SET_ERROR', error.response.data.error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    async generateContract({ commit }, contractId) {
      try {
        const response = await this.$http.post(`/api/v1/contracts/${contractId}/generate`);
        return response.data.ai_generation;
      } catch (error) {
        commit('SET_ERROR', error.response.data.error.message);
        throw error;
      }
    }
  }
};

// Vue Component Usage
export default {
  data() {
    return {
      contractForm: {
        title: '',
        contract_type: 'service_agreement',
        plain_english_input: '',
        client_name: '',
        contract_value: null
      }
    };
  },

  methods: {
    async submitContract() {
      try {
        await this.$store.dispatch('contracts/createContract', this.contractForm);
        this.$router.push('/contracts');
        this.$toast.success('Contract created successfully');
      } catch (error) {
        this.$toast.error('Failed to create contract');
      }
    }
  }
};
```

This comprehensive API documentation provides everything needed for frontend developers to integrate with the Pactoria backend, covering all endpoints, authentication, error handling, and practical integration examples.