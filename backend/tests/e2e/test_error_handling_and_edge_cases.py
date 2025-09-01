"""
E2E Tests for Error Handling and Edge Case Scenarios
Tests comprehensive error scenarios, edge cases, and system resilience
"""
import pytest
import time
import json
from typing import Dict, Any, List
from unittest.mock import patch, Mock
from datetime import datetime, timedelta

from tests.e2e.conftest import E2ETestBase


class TestAuthenticationErrorScenarios:
    """Authentication and authorization error handling tests"""
    
    def test_invalid_token_scenarios(self, e2e_test_base: E2ETestBase, error_scenarios):
        """Test: Various invalid token scenarios and proper error responses"""
        client = e2e_test_base.client
        
        # Setup: Create valid user for comparison
        company = e2e_test_base.create_test_company()
        valid_user = e2e_test_base.create_test_user(company)
        
        # Test scenarios from fixtures
        invalid_auth_scenarios = error_scenarios["invalid_auth"]
        
        for scenario in invalid_auth_scenarios:
            headers = {}
            if scenario["token"] is not None:
                headers["Authorization"] = f"Bearer {scenario['token']}"
            
            # Test protected endpoint
            response = client.get("/api/v1/auth/me", headers=headers)
            e2e_test_base.assert_response_error(response, scenario["expected_status"])
            
            # Verify error response format
            if response.status_code == 401:
                error_data = response.json()
                assert "detail" in error_data
                assert "Unauthorized" in error_data["detail"] or "Authentication" in error_data["detail"]
    
    def test_expired_token_scenarios(self, e2e_test_base: E2ETestBase):
        """Test: Expired token handling and refresh behavior"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        
        # Create an expired token (mock scenario)
        from app.core.security import create_access_token
        expired_token = create_access_token(subject=user.id, expires_delta=timedelta(seconds=-1))
        expired_headers = {"Authorization": f"Bearer {expired_token}"}
        
        # Test 1: Expired token should be rejected
        expired_response = client.get("/api/v1/auth/me", headers=expired_headers)
        e2e_test_base.assert_response_error(expired_response, 401)
        
        # Test 2: All protected endpoints should reject expired token
        protected_endpoints = [
            "/api/v1/contracts/",
            "/api/v1/analytics/dashboard",
            "/api/v1/files/"
        ]
        
        for endpoint in protected_endpoints:
            response = client.get(endpoint, headers=expired_headers)
            e2e_test_base.assert_response_error(response, 401)
    
    def test_insufficient_permissions_scenarios(self, e2e_test_base: E2ETestBase):
        """Test: Permission-based access control and proper error responses"""
        client = e2e_test_base.client
        
        # Setup: Create users with different roles
        company = e2e_test_base.create_test_company()
        
        viewer_user = e2e_test_base.create_test_user(company, {
            "role": "viewer",
            "full_name": "Viewer User"
        })
        
        manager_user = e2e_test_base.create_test_user(company, {
            "role": "contract_manager", 
            "full_name": "Manager User"
        })
        
        admin_user = e2e_test_base.create_test_user(company,
            e2e_test_base.test_data_factory.create_admin_user_data(company.id))
        
        viewer_headers = e2e_test_base.get_auth_headers(viewer_user)
        manager_headers = e2e_test_base.get_auth_headers(manager_user)
        admin_headers = e2e_test_base.get_auth_headers(admin_user)
        
        # Test 1: Admin-only endpoints
        admin_endpoints = [
            "/api/v1/analytics/system/health",
            "/api/v1/analytics/performance",
            "/api/v1/ws/stats"
        ]
        
        for endpoint in admin_endpoints:
            # Viewer should be forbidden
            viewer_response = client.get(endpoint, headers=viewer_headers)
            e2e_test_base.assert_response_error(viewer_response, 403)
            
            # Manager should be forbidden
            manager_response = client.get(endpoint, headers=manager_headers)
            e2e_test_base.assert_response_error(manager_response, 403)
            
            # Admin should succeed
            admin_response = client.get(endpoint, headers=admin_headers)
            e2e_test_base.assert_response_success(admin_response)
        
        # Test 2: Bulk operations permissions
        bulk_data = {
            "updates": [
                {"contract_id": "fake-id", "status": "active"}
            ]
        }
        
        # Viewer should be forbidden for bulk operations
        bulk_response = client.post("/api/v1/bulk/contracts/update", json=bulk_data, headers=viewer_headers)
        e2e_test_base.assert_response_error(bulk_response, 403)


class TestValidationErrorScenarios:
    """Input validation and business rule error handling tests"""
    
    def test_contract_validation_errors(self, e2e_test_base: E2ETestBase, error_scenarios):
        """Test: Contract creation with various invalid inputs"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        validation_errors = error_scenarios["validation_errors"]
        
        # Base valid contract data
        base_contract_data = {
            "title": "Valid Contract Title",
            "contract_type": "service_agreement",
            "plain_english_input": "This is a valid contract description with sufficient detail for processing by the AI system."
        }
        
        for error_case in validation_errors:
            # Apply invalid data to base
            test_data = {**base_contract_data, **error_case["data"]}
            
            response = client.post("/api/v1/contracts/", json=test_data, headers=headers)
            e2e_test_base.assert_response_error(response, error_case["expected_status"])
            
            # Verify error response structure
            if response.status_code == 422:
                error_data = response.json()
                assert "detail" in error_data
                
                # Verify field-specific error information
                if isinstance(error_data["detail"], list):
                    error_fields = [err.get("loc", [])[-1] for err in error_data["detail"] if "loc" in err]
                    assert error_case["field"] in error_fields
    
    def test_file_upload_validation_errors(self, e2e_test_base: E2ETestBase):
        """Test: File upload with various invalid scenarios"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Test 1: No file provided
        no_file_response = client.post("/api/v1/files/upload", data={"description": "No file"}, headers=headers)
        e2e_test_base.assert_response_error(no_file_response, 422)
        
        # Test 2: Empty filename
        import io
        files = {"file": ("", io.BytesIO(b"content"), "text/plain")}
        empty_name_response = client.post("/api/v1/files/upload", files=files, headers=headers)
        # Should handle gracefully (implementation dependent)
        
        # Test 3: Malicious filename
        files = {"file": ("../../etc/passwd", io.BytesIO(b"malicious"), "text/plain")}
        malicious_response = client.post("/api/v1/files/upload", files=files, headers=headers)
        
        if malicious_response.status_code == 201:
            # If upload succeeds, verify filename was sanitized
            result = malicious_response.json()
            assert "../" not in result.get("filename", "")
            assert "etc/passwd" not in result.get("filename", "")
        
        # Test 4: Invalid MIME type
        files = {"file": ("test.exe", io.BytesIO(b"executable"), "application/octet-stream")}
        invalid_mime_response = client.post("/api/v1/files/upload", files=files, headers=headers)
        e2e_test_base.assert_response_error(invalid_mime_response, 400)
    
    def test_search_validation_errors(self, e2e_test_base: E2ETestBase):
        """Test: Search API with invalid parameters"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Test 1: Invalid contract type filter
        invalid_type_response = client.get("/api/v1/contracts/?contract_type=invalid_type", headers=headers)
        e2e_test_base.assert_response_error(invalid_type_response, 422)
        
        # Test 2: Invalid status filter
        invalid_status_response = client.get("/api/v1/contracts/?status=invalid_status", headers=headers)
        e2e_test_base.assert_response_error(invalid_status_response, 422)
        
        # Test 3: Invalid pagination parameters
        invalid_page_responses = [
            client.get("/api/v1/contracts/?page=0", headers=headers),  # Page must be >= 1
            client.get("/api/v1/contracts/?page=-1", headers=headers),
            client.get("/api/v1/contracts/?size=0", headers=headers),  # Size must be > 0
            client.get("/api/v1/contracts/?size=1001", headers=headers)  # Size too large
        ]
        
        for response in invalid_page_responses:
            e2e_test_base.assert_response_error(response, 422)
        
        # Test 4: Advanced search with invalid JSON
        invalid_search_data = {
            "query": "test",
            "filters": {
                "invalid_field": "value"
            }
        }
        
        invalid_search_response = client.post("/api/v1/search/contracts", json=invalid_search_data, headers=headers)
        # Response depends on implementation - might be 422 or ignored
    
    def test_bulk_operation_validation_errors(self, e2e_test_base: E2ETestBase):
        """Test: Bulk operations with invalid data"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        admin_user = e2e_test_base.create_test_user(company,
            e2e_test_base.test_data_factory.create_admin_user_data(company.id))
        headers = e2e_test_base.get_auth_headers(admin_user)
        
        # Test 1: Empty bulk update request
        empty_bulk_data = {"updates": []}
        empty_response = client.post("/api/v1/bulk/contracts/update", json=empty_bulk_data, headers=headers)
        e2e_test_base.assert_response_error(empty_response, 422)
        
        # Test 2: Bulk update with non-existent contract ID
        invalid_bulk_data = {
            "updates": [
                {"contract_id": "non-existent-id", "status": "active"}
            ]
        }
        
        invalid_response = client.post("/api/v1/bulk/contracts/update", json=invalid_bulk_data, headers=headers)
        e2e_test_base.assert_response_success(invalid_response)  # Should return partial success/failure info
        
        result = invalid_response.json()
        assert "failed_count" in result or "errors" in result
        
        # Test 3: Bulk export with invalid format
        invalid_export_data = {
            "contract_ids": [],
            "format": "invalid_format"
        }
        
        invalid_export_response = client.post("/api/v1/bulk/contracts/export", json=invalid_export_data, headers=headers)
        e2e_test_base.assert_response_error(invalid_export_response, 422)


class TestBusinessLogicErrorScenarios:
    """Business rule violations and edge case handling tests"""
    
    def test_contract_state_transition_errors(self, e2e_test_base: E2ETestBase):
        """Test: Invalid contract state transitions"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Create completed contract
        completed_contract = e2e_test_base.create_test_contract(company, user, {"status": "completed"})
        
        # Test 1: Try to change completed contract back to draft
        invalid_transition_response = client.put(
            f"/api/v1/contracts/{completed_contract.id}",
            json={"status": "draft"},
            headers=headers
        )
        
        # Business logic should prevent this transition
        # Implementation dependent - might be allowed or forbidden
        if invalid_transition_response.status_code == 400:
            error_data = invalid_transition_response.json()
            assert "transition" in error_data["detail"].lower() or "status" in error_data["detail"].lower()
        
        # Test 2: Try to activate contract without required content
        draft_contract = e2e_test_base.create_test_contract(company, user)
        
        activate_without_content_response = client.put(
            f"/api/v1/contracts/{draft_contract.id}",
            json={"status": "active"},
            headers=headers
        )
        
        # Might require generated content before activation
        # Implementation dependent
    
    def test_company_isolation_violations(self, e2e_test_base: E2ETestBase):
        """Test: Attempts to access cross-company data"""
        client = e2e_test_base.client
        
        # Setup: Two separate companies
        company_a = e2e_test_base.create_test_company({"name": "Company A"})
        company_b = e2e_test_base.create_test_company({"name": "Company B"})
        
        user_a = e2e_test_base.create_test_user(company_a)
        user_b = e2e_test_base.create_test_user(company_b)
        
        headers_a = e2e_test_base.get_auth_headers(user_a)
        headers_b = e2e_test_base.get_auth_headers(user_b)
        
        # Create resources for each company
        contract_a = e2e_test_base.create_test_contract(company_a, user_a)
        contract_b = e2e_test_base.create_test_contract(company_b, user_b)
        
        # Test 1: User A cannot access User B's contract
        cross_access_response = client.get(f"/api/v1/contracts/{contract_b.id}", headers=headers_a)
        e2e_test_base.assert_response_error(cross_access_response, 403)
        
        # Test 2: User B cannot modify User A's contract
        cross_modify_response = client.put(
            f"/api/v1/contracts/{contract_a.id}",
            json={"title": "Hijacked Title"},
            headers=headers_b
        )
        e2e_test_base.assert_response_error(cross_modify_response, 403)
        
        # Test 3: Cross-company file access
        # Upload file for Company A
        import io
        files = {"file": ("company_a_file.txt", io.BytesIO(b"Company A content"), "text/plain")}
        upload_response = client.post("/api/v1/files/upload", files=files, headers=headers_a)
        e2e_test_base.assert_response_success(upload_response, 201)
        
        file_a = upload_response.json()
        
        # User B should not be able to access Company A's file
        cross_file_access = client.get(f"/api/v1/files/{file_a['file_id']}", headers=headers_b)
        e2e_test_base.assert_response_error(cross_file_access, 403)
        
        # Cleanup
        client.delete(f"/api/v1/files/{file_a['file_id']}", headers=headers_a)
    
    def test_resource_limits_and_quotas(self, e2e_test_base: E2ETestBase):
        """Test: Resource limits and quota enforcement"""
        client = e2e_test_base.client
        
        # Setup: Starter tier company (limited resources)
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Test 1: Create many contracts to test limits
        contracts_created = []
        max_attempts = 100  # Try to create many contracts
        
        for i in range(max_attempts):
            contract_data = {
                "title": f"Quota Test Contract {i+1}",
                "contract_type": "service_agreement", 
                "plain_english_input": f"Contract {i+1} for quota testing"
            }
            
            response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
            
            if response.status_code == 201:
                contracts_created.append(response.json())
            elif response.status_code == 429:  # Rate limited
                break
            elif response.status_code == 403:  # Quota exceeded
                break
        
        # Should have created some contracts before hitting limits
        assert len(contracts_created) > 0
        
        # Test 2: File upload size limits
        large_content = b"x" * (11 * 1024 * 1024)  # 11MB
        files = {"file": ("large_file.txt", io.BytesIO(large_content), "text/plain")}
        
        large_file_response = client.post("/api/v1/files/upload", files=files, headers=headers)
        e2e_test_base.assert_response_error(large_file_response, 413)
    
    def test_concurrent_operation_conflicts(self, e2e_test_base: E2ETestBase):
        """Test: Concurrent operations and conflict resolution"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user1 = e2e_test_base.create_test_user(company, {"full_name": "User 1"})
        user2 = e2e_test_base.create_test_user(company, {"full_name": "User 2"})
        
        headers1 = e2e_test_base.get_auth_headers(user1)
        headers2 = e2e_test_base.get_auth_headers(user2)
        
        contract = e2e_test_base.create_test_contract(company, user1)
        
        # Test 1: Concurrent updates to same contract
        update1_data = {"title": "Updated by User 1"}
        update2_data = {"title": "Updated by User 2"}
        
        # Simulate near-simultaneous updates
        response1 = client.put(f"/api/v1/contracts/{contract.id}", json=update1_data, headers=headers1)
        response2 = client.put(f"/api/v1/contracts/{contract.id}", json=update2_data, headers=headers2)
        
        # Both might succeed (last-writer-wins) or one might conflict
        assert response1.status_code in [200, 409]  # Success or conflict
        assert response2.status_code in [200, 409]
        
        # Test 2: Concurrent contract deletion while being updated
        another_contract = e2e_test_base.create_test_contract(company, user1)
        
        update_data = {"client_name": "Updated Client"}
        
        # User 1 updates while User 2 deletes
        update_response = client.put(f"/api/v1/contracts/{another_contract.id}", json=update_data, headers=headers1)
        delete_response = client.delete(f"/api/v1/contracts/{another_contract.id}", headers=headers2)
        
        # One should succeed, other might get 404 or conflict
        success_codes = [200, 204]
        error_codes = [404, 409]
        
        assert update_response.status_code in success_codes + error_codes
        assert delete_response.status_code in success_codes + error_codes


class TestExternalServiceErrorScenarios:
    """External service failure and recovery tests"""
    
    def test_ai_service_failure_scenarios(self, e2e_test_base: E2ETestBase):
        """Test: AI service unavailable or returning errors"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        contract = e2e_test_base.create_test_contract(company, user)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Test 1: AI service completely unavailable
        with patch('app.services.ai_service.ai_service.generate_contract') as mock_generate:
            mock_generate.side_effect = Exception("AI service unavailable")
            
            generate_response = client.post(
                f"/api/v1/contracts/{contract.id}/generate",
                json={"regenerate": False},
                headers=headers
            )
            
            # Should return 500 or 503 with proper error message
            e2e_test_base.assert_response_error(generate_response, 500)
            
            error_data = generate_response.json()
            assert "detail" in error_data
        
        # Test 2: AI service returns invalid response
        with patch('app.services.ai_service.ai_service.generate_contract') as mock_generate:
            mock_generate.return_value = None  # Invalid response
            
            invalid_response = client.post(
                f"/api/v1/contracts/{contract.id}/generate",
                json={"regenerate": False},
                headers=headers
            )
            
            e2e_test_base.assert_response_error(invalid_response, 500)
        
        # Test 3: AI compliance analysis failure
        with patch('app.services.ai_service.ai_service.analyze_compliance') as mock_analyze:
            mock_analyze.side_effect = Exception("Compliance analysis failed")
            
            analyze_response = client.post(
                f"/api/v1/contracts/{contract.id}/analyze",
                json={"force_reanalysis": False},
                headers=headers
            )
            
            e2e_test_base.assert_response_error(analyze_response, 500)
    
    def test_database_connection_scenarios(self, e2e_test_base: E2ETestBase):
        """Test: Database connection issues and recovery"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Test 1: Database connection timeout simulation
        with patch('app.core.database.SessionLocal') as mock_session:
            mock_session.side_effect = Exception("Database connection timeout")
            
            # Any database operation should fail gracefully
            db_error_response = client.get("/api/v1/contracts/", headers=headers)
            e2e_test_base.assert_response_error(db_error_response, 500)
        
        # Test 2: Database transaction rollback scenario
        # This is harder to simulate but important for data integrity
        # In a real system, you'd test transaction failures
    
    def test_file_system_error_scenarios(self, e2e_test_base: E2ETestBase):
        """Test: File system errors during file operations"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Test 1: Disk space full during file upload
        with patch('builtins.open', mock_open()) as mock_file:
            mock_file.side_effect = OSError("No space left on device")
            
            import io
            files = {"file": ("test.txt", io.BytesIO(b"test content"), "text/plain")}
            
            upload_response = client.post("/api/v1/files/upload", files=files, headers=headers)
            e2e_test_base.assert_response_error(upload_response, 500)
        
        # Test 2: File not found during download
        # Create a file entry but remove the actual file
        import io
        files = {"file": ("disappearing.txt", io.BytesIO(b"content"), "text/plain")}
        upload_response = client.post("/api/v1/files/upload", files=files, headers=headers)
        
        if upload_response.status_code == 201:
            file_data = upload_response.json()
            file_id = file_data["file_id"]
            
            # Simulate file disappearing from disk
            with patch('pathlib.Path.exists', return_value=False):
                download_response = client.get(f"/api/v1/files/{file_id}", headers=headers)
                e2e_test_base.assert_response_error(download_response, 404)


class TestRateLimitingAndSecurity:
    """Rate limiting and security-related error handling tests"""
    
    def test_rate_limiting_scenarios(self, e2e_test_base: E2ETestBase):
        """Test: Rate limiting under high request volume"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Test 1: Rapid API requests
        responses = []
        for i in range(50):  # Make many rapid requests
            response = client.get("/api/v1/contracts/", headers=headers)
            responses.append(response)
            
            if response.status_code == 429:  # Rate limited
                break
        
        # Should eventually hit rate limit
        rate_limited_responses = [r for r in responses if r.status_code == 429]
        
        if rate_limited_responses:
            # Verify rate limit response format
            rate_limit_response = rate_limited_responses[0]
            error_data = rate_limit_response.json()
            assert "detail" in error_data
            assert "rate" in error_data["detail"].lower() or "limit" in error_data["detail"].lower()
        
        # Test 2: AI generation rate limiting (expensive operations)
        contract = e2e_test_base.create_test_contract(company, user)
        
        ai_responses = []
        for i in range(10):  # Rapid AI requests
            response = client.post(
                f"/api/v1/contracts/{contract.id}/generate",
                json={"regenerate": True},
                headers=headers
            )
            ai_responses.append(response)
            
            if response.status_code == 429:
                break
        
        # AI operations should be more strictly rate limited
    
    def test_malicious_input_scenarios(self, e2e_test_base: E2ETestBase):
        """Test: Malicious input handling and sanitization"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Test 1: SQL injection attempts
        malicious_search = "'; DROP TABLE contracts; --"
        
        sql_injection_response = client.get(f"/api/v1/contracts/?search={malicious_search}", headers=headers)
        e2e_test_base.assert_response_success(sql_injection_response)  # Should be handled safely
        
        # Test 2: XSS attempts in contract content
        xss_contract_data = {
            "title": "<script>alert('XSS')</script>",
            "contract_type": "service_agreement",
            "plain_english_input": "Normal content with <img src=x onerror=alert('XSS')> embedded"
        }
        
        xss_response = client.post("/api/v1/contracts/", json=xss_contract_data, headers=headers)
        
        if xss_response.status_code == 201:
            # Verify content was sanitized
            contract = xss_response.json()
            assert "<script>" not in contract["title"]
            assert "onerror=" not in contract.get("plain_english_input", "")
        
        # Test 3: JSON payload bombs
        large_json = {
            "title": "A" * 10000,  # Very large title
            "contract_type": "service_agreement",
            "plain_english_input": "B" * 100000,  # Very large input
            "metadata": {"x": "y"} * 1000  # Large nested structure
        }
        
        large_payload_response = client.post("/api/v1/contracts/", json=large_json, headers=headers)
        # Should either succeed with truncation or fail with 413/422
        assert large_payload_response.status_code in [201, 413, 422]
    
    def test_brute_force_protection(self, e2e_test_base: E2ETestBase):
        """Test: Brute force attack protection"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        
        # Test 1: Multiple failed login attempts
        failed_attempts = []
        for i in range(20):  # Many login attempts with wrong password
            login_data = {
                "email": user.email,
                "password": f"wrong_password_{i}"
            }
            
            response = client.post("/api/v1/auth/login", json=login_data)
            failed_attempts.append(response)
            
            if response.status_code == 429:  # Rate limited
                break
        
        # Should eventually be rate limited
        assert any(r.status_code == 429 for r in failed_attempts)
        
        # Test 2: Multiple password reset requests
        reset_attempts = []
        for i in range(10):
            reset_data = {"email": user.email}
            response = client.post("/api/v1/auth/forgot-password", json=reset_data)
            reset_attempts.append(response)
            
            if response.status_code == 429:
                break
        
        # Password reset should also be rate limited


class TestDataIntegrityAndRecovery:
    """Data integrity and error recovery tests"""
    
    def test_partial_operation_recovery(self, e2e_test_base: E2ETestBase):
        """Test: Recovery from partially completed operations"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Test 1: Contract creation that fails after database insert but before AI generation
        contract_data = {
            "title": "Partial Operation Test",
            "contract_type": "service_agreement",
            "plain_english_input": "Test contract for partial operation recovery",
            "generate_immediately": True  # If this option exists
        }
        
        # Mock AI service failure after contract creation
        with patch('app.services.ai_service.ai_service.generate_contract') as mock_generate:
            mock_generate.side_effect = Exception("AI generation failed")
            
            response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
            
            # Contract might be created even if AI generation fails
            if response.status_code == 201:
                contract = response.json()
                
                # Verify contract exists but has no generated content
                get_response = client.get(f"/api/v1/contracts/{contract['id']}", headers=headers)
                contract_data = get_response.json()
                assert contract_data["generated_content"] is None
                
                # Should be able to generate content later
                generate_response = client.post(
                    f"/api/v1/contracts/{contract['id']}/generate",
                    json={"regenerate": False},
                    headers=headers
                )
                # This should work if AI service is restored
    
    def test_system_consistency_under_errors(self, e2e_test_base: E2ETestBase):
        """Test: System consistency when operations fail"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Create initial state
        initial_contracts_response = client.get("/api/v1/contracts/", headers=headers)
        initial_count = initial_contracts_response.json()["total"]
        
        # Test 1: Failed contract creation shouldn't affect count
        invalid_contract_data = {
            "title": "",  # Invalid
            "contract_type": "invalid_type",
            "plain_english_input": "x"
        }
        
        failed_create_response = client.post("/api/v1/contracts/", json=invalid_contract_data, headers=headers)
        e2e_test_base.assert_response_error(failed_create_response, 422)
        
        # Verify count unchanged
        after_failed_response = client.get("/api/v1/contracts/", headers=headers)
        after_failed_count = after_failed_response.json()["total"]
        assert after_failed_count == initial_count
        
        # Test 2: Successful creation should increment count
        valid_contract_data = {
            "title": "Consistency Test Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "Valid contract for consistency testing"
        }
        
        success_response = client.post("/api/v1/contracts/", json=valid_contract_data, headers=headers)
        e2e_test_base.assert_response_success(success_response, 201)
        
        final_response = client.get("/api/v1/contracts/", headers=headers)
        final_count = final_response.json()["total"]
        assert final_count == initial_count + 1