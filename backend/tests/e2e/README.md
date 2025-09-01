# Comprehensive End-to-End (E2E) Test Suite

This directory contains a comprehensive end-to-end test suite for the Pactoria MVP backend that simulates all possible frontend scenarios and validates complete user journeys.

## 🎯 Overview

The E2E test suite provides comprehensive validation of the backend system by testing complete workflows that mirror real frontend usage patterns. These tests ensure the backend is fully prepared for frontend integration and can handle all expected user scenarios.

## 📁 Test Structure

```
tests/e2e/
├── conftest.py                              # Base test configuration and utilities
├── test_authentication_flows.py            # Complete auth workflows  
├── test_contract_lifecycle.py              # Full contract management
├── test_realtime_collaboration.py          # Multi-user collaboration & WebSockets
├── test_search_and_analytics.py            # Search functionality & analytics
├── test_file_management_and_bulk_operations.py  # File ops & bulk operations
├── test_error_handling_and_edge_cases.py   # Error scenarios & edge cases
├── test_performance_and_load.py            # Performance & load testing
├── test_data_factories.py                  # Realistic test data generation
└── README.md                               # This file
```

## 🧪 Test Categories

### 1. Authentication & User Management (`test_authentication_flows.py`)

**Scenarios Covered:**
- Complete user onboarding flow (registration → company creation → login → dashboard access)
- Login/logout workflows with token management
- Password reset and change workflows
- Profile and company management
- Role-based access control (Admin/Manager/Viewer)
- Multi-user company scenarios
- Company isolation validation
- User limit enforcement

**Key Test Cases:**
- `test_complete_user_onboarding_flow`: New user registration through first contract creation
- `test_login_logout_flow`: Authentication lifecycle with token validation
- `test_admin_user_permissions`: Admin-only feature access validation
- `test_company_isolation`: Cross-company data access prevention

### 2. Contract Lifecycle (`test_contract_lifecycle.py`)

**Scenarios Covered:**
- Complete contract creation workflow (Create → Generate → Analyze → Activate → Complete)
- Template-based contract creation
- AI content generation and regeneration
- Compliance analysis workflows
- Contract state transitions
- Version control and audit trails
- Multi-user collaboration on contracts
- Business rule validation

**Key Test Cases:**
- `test_complete_contract_creation_workflow`: Full lifecycle from creation to completion
- `test_template_based_contract_creation`: Using templates for contract generation
- `test_contract_collaboration_workflow`: Multiple users working on same contract
- `test_contract_compliance_workflow`: Analysis and compliance improvement cycle

### 3. Real-time Collaboration (`test_realtime_collaboration.py`)

**Scenarios Covered:**
- WebSocket connection establishment and authentication
- Real-time contract update notifications
- Multi-user concurrent editing
- User presence tracking
- Live compliance updates
- Performance under concurrent load
- Connection handling and recovery

**Key Test Cases:**
- `test_websocket_connection_flow`: WebSocket authentication and connection
- `test_contract_update_notifications`: Real-time update propagation
- `test_concurrent_contract_editing`: Multiple users editing simultaneously
- `test_user_presence_tracking`: Online user visibility

### 4. Search & Analytics (`test_search_and_analytics.py`)

**Scenarios Covered:**
- Advanced search with complex filters
- Pagination and sorting
- Analytics dashboard data
- Business metrics calculation
- Time-series analytics
- Export functionality
- Performance with large datasets
- Admin-only analytics access

**Key Test Cases:**
- `test_comprehensive_contract_search_workflow`: All search features with large dataset
- `test_complete_dashboard_analytics_workflow`: Full analytics pipeline
- `test_large_contract_dataset_performance`: Search performance at scale
- `test_admin_only_analytics`: Permission validation for sensitive data

### 5. File Management & Bulk Operations (`test_file_management_and_bulk_operations.py`)

**Scenarios Covered:**
- File upload, download, and management
- Multiple file type support
- File validation and security
- Bulk contract operations (update/delete/export)
- Bulk user management
- Large file handling
- Company-based file isolation
- Performance optimization

**Key Test Cases:**
- `test_complete_file_upload_workflow`: Full file lifecycle
- `test_bulk_contract_update_workflow`: Mass contract updates
- `test_file_validation_and_security`: Security and validation testing
- `test_bulk_export_performance`: Large export operations

### 6. Error Handling & Edge Cases (`test_error_handling_and_edge_cases.py`)

**Scenarios Covered:**
- Authentication errors (invalid tokens, expired sessions)
- Input validation failures
- Business rule violations
- External service failures (AI service unavailable)
- Database connection issues
- Rate limiting and security
- Malicious input handling
- System resilience testing

**Key Test Cases:**
- `test_invalid_token_scenarios`: All authentication failure modes
- `test_ai_service_failure_scenarios`: Graceful degradation when AI unavailable
- `test_malicious_input_scenarios`: Security against attacks
- `test_rate_limiting_scenarios`: System protection under load

### 7. Performance & Load Testing (`test_performance_and_load.py`)

**Scenarios Covered:**
- API response time benchmarks
- Concurrent user simulation
- Large dataset performance
- Memory usage optimization
- Database connection pooling
- Scalability projections
- Performance regression detection
- Resource usage monitoring

**Key Test Cases:**
- `test_api_response_time_benchmarks`: Performance targets validation
- `test_concurrent_user_load`: Multi-user simulation
- `test_large_dataset_performance`: Scale testing with 500+ contracts
- `test_memory_usage_under_load`: Resource consumption monitoring

## 🛠️ Test Utilities

### Base Test Infrastructure (`conftest.py`)

**Key Components:**
- `TestDataFactory`: Generates realistic test data
- `E2ETestBase`: Base class with common utilities
- `WebSocketTestHelper`: WebSocket testing support  
- `PerformanceTestHelper`: Performance measurement utilities
- Comprehensive fixture system for all test scenarios

### Realistic Test Data (`test_data_factories.py`)

**Features:**
- UK-specific business data generation
- Realistic contract types and content
- Proper user roles and permissions
- Company structures and relationships
- Performance testing datasets
- Business scenario simulation

## 🚀 Running the Tests

### Quick Start

```bash
# Run all E2E tests
python tests/run_e2e_tests.py

# Run specific categories
python tests/run_e2e_tests.py --categories authentication_flows contract_lifecycle

# Quick subset for development
python tests/run_e2e_tests.py --quick

# Performance focused run
python tests/run_e2e_tests.py --categories performance_and_load
```

### Prerequisites

1. **Backend Server Running**
   ```bash
   cd /Users/rezazeraat/Desktop/Pactoria-MVP/backend
   source venv/bin/activate
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Environment Variables**
   - `SECRET_KEY`: JWT token signing key
   - `GROQ_API_KEY`: AI service API key
   - `DATABASE_URL`: Database connection (if not using default)

3. **Dependencies**
   ```bash
   pip install pytest pytest-asyncio requests websockets faker
   ```

### Individual Test Execution

```bash
# Run specific test file
pytest tests/e2e/test_authentication_flows.py -v

# Run specific test function
pytest tests/e2e/test_contract_lifecycle.py::TestContractLifecycleFlows::test_complete_contract_creation_workflow -v

# Run with performance timing
pytest tests/e2e/test_performance_and_load.py -v --durations=10
```

## 📊 Test Reporting

### Comprehensive Reports

The test runner generates detailed reports including:

- **Test Execution Summary**: Pass/fail rates, timing, coverage
- **Performance Metrics**: Response times, throughput, benchmarks
- **Business Requirement Validation**: Requirements coverage analysis
- **Error Analysis**: Failure patterns and recommendations
- **Scalability Assessment**: Performance under load

### Report Locations

```
backend/test_results/
├── e2e_test_results_YYYYMMDD_HHMMSS.json  # Detailed results
├── latest_e2e_summary.json               # Quick summary
└── performance_benchmarks.json           # Performance data
```

### Continuous Integration

For CI/CD integration:

```yaml
# Example GitHub Actions step
- name: Run E2E Tests
  run: |
    python tests/run_e2e_tests.py --categories authentication_flows contract_lifecycle search_and_analytics
    # Upload test results as artifacts
```

## 🎯 Success Criteria

The E2E test suite validates that the backend meets these criteria:

### Functional Requirements
- ✅ **95%+ test pass rate** across all scenarios
- ✅ **Complete user journey coverage** from registration to advanced features
- ✅ **All business rules validated** with proper error handling
- ✅ **Multi-user scenarios working** with proper isolation
- ✅ **Real-time features functional** with WebSocket reliability

### Performance Requirements  
- ✅ **API responses < 500ms average** for standard operations
- ✅ **AI operations < 10 seconds** for content generation
- ✅ **Search performance < 1 second** with 100+ contracts
- ✅ **Bulk operations complete** within reasonable timeframes
- ✅ **Concurrent user support** without degradation

### Security & Reliability
- ✅ **Authentication & authorization** properly enforced
- ✅ **Company data isolation** maintained
- ✅ **Input validation** prevents malicious data
- ✅ **Error handling** provides graceful degradation
- ✅ **Rate limiting** protects against abuse

## 🔧 Extending the Test Suite

### Adding New Test Cases

1. **Choose appropriate test file** based on functionality
2. **Follow existing patterns** for consistency
3. **Use realistic test data** from factories
4. **Include performance measurements** where relevant
5. **Test both success and failure scenarios**

### Example New Test Case

```python
def test_new_feature_workflow(self, e2e_test_base: E2ETestBase, performance_helper):
    """Test: Complete new feature workflow"""
    client = e2e_test_base.client
    
    # Setup: Create test data
    company = e2e_test_base.create_test_company()
    user = e2e_test_base.create_test_user(company)
    headers = e2e_test_base.get_auth_headers(user)
    
    # Test steps with performance measurement
    with performance_helper.measure_time("new_feature_operation"):
        response = client.post("/api/v1/new-feature/", json=test_data, headers=headers)
        e2e_test_base.assert_response_success(response, 201)
    
    # Validation and cleanup
    result = response.json()
    assert result["expected_field"] == "expected_value"
    
    # Performance assertion
    performance_helper.assert_performance("new_feature_operation", 2000)
```

### Custom Test Data

```python
# Add to test_data_factories.py
def generate_custom_scenario_data(self, **overrides):
    """Generate data for custom scenario"""
    return {
        "field1": self.fake.custom_data(),
        "field2": custom_business_logic(),
        **overrides
    }
```

## 🐛 Debugging Failed Tests

### Common Issues

1. **Server Not Running**
   - Ensure backend server is running on localhost:8000
   - Check server logs for startup errors

2. **Database State**
   - Each test uses isolated database
   - Check for database connectivity issues

3. **Environment Variables**
   - Verify all required environment variables are set
   - Check API keys are valid

4. **Race Conditions**
   - WebSocket tests may have timing issues
   - Increase timeouts if needed

### Debug Commands

```bash
# Verbose output with debugging
pytest tests/e2e/test_contract_lifecycle.py::test_failing_test -v -s --pdb

# Check specific test in isolation
pytest tests/e2e/test_authentication_flows.py::TestAuthenticationFlows::test_login_logout_flow -v

# Run with performance profiling
pytest tests/e2e/test_performance_and_load.py --durations=0 -v
```

## 📈 Performance Benchmarks

### Target Metrics

| Operation | Target Time | Acceptable | Notes |
|-----------|-------------|------------|-------|
| User Login | 200ms | 500ms | Authentication |
| Contract List | 300ms | 800ms | Standard pagination |
| Contract Creation | 1500ms | 3000ms | Without AI generation |
| AI Generation | 5000ms | 15000ms | External service dependency |
| Search (Basic) | 500ms | 1500ms | Small datasets |
| Analytics Dashboard | 2000ms | 5000ms | Complex aggregations |
| File Upload (5MB) | 3000ms | 8000ms | Network dependent |

### Load Testing Results

The performance tests validate system behavior under:
- **10 concurrent users**: Normal operation
- **50 concurrent users**: Peak usage simulation  
- **100+ contracts**: Large dataset performance
- **Multiple file uploads**: I/O intensive operations

## 🏆 Best Practices

### Test Design
1. **Test complete user journeys** not just individual endpoints
2. **Use realistic test data** that mirrors production scenarios
3. **Include both positive and negative test cases**
4. **Measure performance consistently** across all operations
5. **Test error conditions and edge cases** thoroughly

### Test Maintenance
1. **Keep tests independent** - no dependencies between test cases
2. **Use proper cleanup** to prevent test pollution
3. **Update tests** when business requirements change
4. **Monitor test performance** - slow tests indicate system issues
5. **Regular test data refresh** to maintain realism

### Integration with Development
1. **Run critical tests** during development
2. **Full test suite** before releases
3. **Performance regression detection** in CI/CD
4. **Test results integration** with monitoring systems

## 📞 Support

For questions about the E2E test suite:

1. **Test Structure**: Review `conftest.py` for base utilities
2. **Test Data**: Check `test_data_factories.py` for data generation
3. **Performance**: Use `PerformanceTestHelper` for measurements
4. **Debugging**: Use pytest debugging features and verbose output

## 📝 Future Enhancements

### Planned Improvements
- **Visual regression testing** for PDF generation
- **API contract testing** with schema validation
- **Chaos engineering tests** for resilience
- **Multi-environment testing** (dev/staging/prod)
- **Automated performance regression detection**

### Metrics Dashboard
- Real-time test execution monitoring
- Historical performance trending
- Business requirement coverage tracking
- Test reliability analytics

---

**This comprehensive E2E test suite ensures the Pactoria MVP backend is fully validated and ready for frontend integration, providing confidence in system reliability, performance, and business requirement compliance.**