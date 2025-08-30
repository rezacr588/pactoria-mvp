# Pactoria MVP Backend Testing Documentation

This document provides comprehensive documentation for the test suite of the Pactoria MVP backend application.

## Test Suite Overview

The Pactoria backend test suite is organized into multiple layers to ensure comprehensive coverage of all MVP requirements and functionality.

### Test Structure

```
tests/
├── test_basic_functionality.py    # Core API functionality tests
├── test_mvp_requirements.py       # MVP business requirements validation
├── conftest.py                     # Test configuration and fixtures
├── unit/                          # Unit tests for individual components
├── integration/                   # Integration tests for API endpoints
└── e2e/                          # End-to-end workflow tests
```

## Test Categories

### 1. Basic Functionality Tests (`test_basic_functionality.py`)

These tests verify that the core API endpoints work correctly and provide the expected functionality.

#### TestBasicEndpoints
- **Purpose**: Verify basic API infrastructure is working
- **Tests**:
  - `test_root_endpoint()`: Confirms the root endpoint returns application info
  - `test_health_endpoint()`: Validates health check functionality
  - `test_api_status_endpoint()`: Ensures status endpoint returns feature availability
  - `test_api_features_endpoint()`: Verifies API feature listing works

#### TestAuthentication  
- **Purpose**: Validate authentication system functionality
- **Tests**:
  - `test_user_registration()`: User can successfully register with email/password
  - `test_user_login_with_valid_credentials()`: Valid login returns JWT token
  - `test_user_login_with_invalid_credentials()`: Invalid login returns 401
  - `test_protected_endpoint_without_auth()`: Protected routes require authentication
  - `test_protected_endpoint_with_auth()`: JWT tokens provide access to protected routes

#### TestTemplates
- **Purpose**: Verify contract template management functionality
- **Tests**:
  - `test_list_templates()`: Template listing returns available templates
  - `test_filter_templates_by_type()`: Template filtering by contract type works

#### TestContracts
- **Purpose**: Validate contract management CRUD operations
- **Tests**:
  - `test_create_contract()`: New contracts can be created with proper data structure
  - `test_list_contracts()`: User can retrieve their contracts with pagination
  - `test_get_contract_by_id()`: Specific contracts can be retrieved by ID
  - `test_update_contract()`: Contract details can be modified

#### TestAnalytics
- **Purpose**: Ensure analytics endpoints provide business insights
- **Tests**:
  - `test_business_metrics()`: Business analytics return contract and compliance data
  - `test_user_metrics()`: User activity analytics work correctly
  - `test_contract_type_metrics()`: Contract distribution metrics are available

### 2. MVP Requirements Tests (`test_mvp_requirements.py`)

These tests specifically validate that the application meets all MVP requirements from the business plan.

#### TestMVPRequirements
- **Purpose**: Ensure compliance with all MVP business requirements
- **Tests**:
  - `test_core_features_available()`: All 4 core MVP features are implemented
    - Contract Generation Engine ✓
    - UK Legal Compliance System ✓
    - Document Management ✓
    - User Authentication ✓
  
  - `test_twenty_plus_uk_templates()`: Validates 20+ UK legal templates requirement
    - Counts available templates
    - Verifies UK-specific legal content
  
  - `test_five_user_limit_per_company()`: Confirms 5-user account limit
  
  - `test_uk_legal_compliance_95_percent()`: Validates 95%+ compliance accuracy requirement
  
  - `test_groq_ai_integration()`: Confirms Groq ultra-fast inference integration
    - Verifies OpenAI GPT-OSS-120B model usage
    - Confirms Groq as AI provider
  
  - `test_contract_generation_functionality()`: Tests plain English → UK contract conversion
    - Mock AI service integration
    - Validates professional contract output
    - Ensures UK law compliance
  
  - `test_gdpr_compliance_features()`: Validates GDPR compliance capabilities
  
  - `test_version_control_audit_trail()`: Ensures contract versioning and audit trails
  
  - `test_risk_scoring_system()`: Validates 1-10 risk scoring scale
  
  - `test_performance_requirements()`: Confirms response time requirements
  
  - `test_employment_law_compliance()`: UK employment law checking
  
  - `test_consumer_rights_compliance()`: Consumer rights compliance validation

#### TestSecurityAndCompliance
- **Purpose**: Validate security and data protection requirements
- **Tests**:
  - `test_data_isolation_between_companies()`: Multi-tenant data isolation
  - `test_input_validation()`: API input validation and sanitization
  - `test_authentication_required()`: Protected endpoint security

## Test Dependencies and Setup

### Required Setup
1. **Database**: SQLite database with all tables created
2. **Test Data**: UK legal templates loaded (20+ templates)
3. **Dependencies**: All Python packages installed from requirements.txt
4. **Environment**: Test environment with proper configuration

### Test Fixtures and Utilities (`conftest.py`)
- Database session management
- Test client configuration  
- Mock AI service setup
- Authentication helpers

## MVP Compliance Validation

The test suite specifically validates these MVP commitments:

### Core Features (Must Have)
- ✅ Contract Generation Engine
- ✅ UK Legal Compliance System  
- ✅ Document Management
- ✅ User Authentication

### Feature Requirements
- ✅ 20+ UK Legal Templates
- ✅ 5 Users per Account Limit
- ✅ 95%+ UK Legal Compliance Accuracy
- ✅ Plain English → Professional Contracts
- ✅ Three-Step Contract Creation
- ✅ Version Control with Audit Trail
- ✅ PDF Generation and Export
- ✅ Risk Scoring (1-10 Scale)
- ✅ GDPR Compliance Validation
- ✅ Employment Law Requirements
- ✅ Consumer Rights Compliance

### Technical Requirements  
- ✅ Groq Ultra-Fast AI Model (OpenAI GPT-OSS-120B)
- ✅ Performance Requirements (< 2s API response)
- ✅ Multi-tenant Data Isolation
- ✅ Input Validation and Security

## Running the Tests

### Run All Tests
```bash
python -m pytest tests/ -v
```

### Run Specific Test Categories
```bash
# Basic functionality only
python -m pytest tests/test_basic_functionality.py -v

# MVP requirements only  
python -m pytest tests/test_mvp_requirements.py -v

# Unit tests only
python -m pytest tests/unit/ -v

# Integration tests only
python -m pytest tests/integration/ -v
```

### Run with Coverage
```bash
python -m pytest tests/ --cov=app --cov-report=html
```

## Test Data Setup

Before running tests, ensure test data is properly initialized:

```bash
python setup_test_data.py
```

This creates:
- Database tables
- 20+ UK legal templates
- System configuration data

## Expected Test Results

### Passing Criteria
- All basic functionality tests should pass (100% success)
- All MVP requirement tests should pass (100% success)
- Test coverage should be > 80%
- No critical security vulnerabilities

### Performance Criteria
- API endpoints respond within 2 seconds
- Contract generation completes within 30 seconds
- Database queries execute within 1 second

## Troubleshooting Common Test Failures

### Authentication Failures
- Ensure JWT tokens are properly generated and validated
- Check that user registration creates proper database records
- Verify password hashing is working correctly

### Database Errors
- Run `setup_test_data.py` to initialize database
- Check database connection configuration
- Ensure all tables are created properly

### AI Service Errors
- Mock AI services are used in tests to avoid external API calls
- Verify mock configurations return expected data structures
- Check that AI service integration points exist

### Template Errors
- Ensure 20+ templates are loaded via setup script
- Verify template filtering and querying works
- Check template data structure matches schema

## Continuous Integration

The test suite is designed to run in CI/CD pipelines with:
- Automated database setup
- Mock external services
- Parallel test execution
- Coverage reporting
- Performance benchmarking

## Test Maintenance

### Adding New Tests
1. Follow existing test patterns and naming conventions
2. Add documentation for test purpose and requirements
3. Update this documentation with new test descriptions
4. Ensure tests are independent and can run in any order

### Updating MVP Requirements
When business requirements change:
1. Update corresponding tests in `test_mvp_requirements.py`
2. Add new validation criteria
3. Update this documentation
4. Ensure backward compatibility where possible

This testing documentation ensures that the Pactoria MVP backend meets all business requirements and maintains high quality standards throughout development and deployment.