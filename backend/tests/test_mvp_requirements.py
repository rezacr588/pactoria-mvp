"""
MVP Requirements Tests for Pactoria Backend
Tests specific MVP requirements from the business plan
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app

client = TestClient(app)


class TestMVPRequirements:
    """Test MVP requirements compliance"""

    def test_core_features_available(self):
        """Test MVP Core Features are available via API"""
        response = client.get("/api/v1/status/")
        assert response.status_code == 200

        data = response.json()
        required_features = [
            "contract_generation",
            "uk_legal_compliance",
            "document_management",
            "user_authentication",
        ]

        for feature in required_features:
            assert feature in data["features"], f"Missing core feature: {feature}"
            assert data["features"][feature] is True

    def test_twenty_plus_uk_templates(self):
        """Test MVP requirement: 20+ UK legal templates"""
        response = client.get("/api/v1/contracts/templates/")
        assert response.status_code == 200

        templates = response.json()
        assert len(templates) >= 20, f"Expected 20+ templates, got {len(templates)}"

        # Verify they're UK-focused
        uk_indicators = ["uk", "england", "wales", "gdpr", "consumer rights"]
        uk_template_count = 0

        for template in templates:
            template_text = (
                template.get("description", "") + template.get("template_content", "")
            ).lower()

            if any(indicator in template_text for indicator in uk_indicators):
                uk_template_count += 1

        assert uk_template_count >= 15, "Not enough UK-specific templates"

    def test_five_user_limit_per_company(self):
        """Test MVP requirement: 5 users per account limit"""
        response = client.get("/api/v1/status/")
        assert response.status_code == 200

        data = response.json()
        assert "core_capabilities" in data
        assert "user_limits" in data["core_capabilities"]
        assert data["core_capabilities"]["user_limits"] == 5

    def test_uk_legal_compliance_95_percent(self):
        """Test MVP requirement: 95%+ UK legal compliance accuracy"""
        response = client.get("/api/v1/status/")
        assert response.status_code == 200

        data = response.json()
        assert "compliance" in data
        assert "min_compliance_score" in data["compliance"]
        assert data["compliance"]["min_compliance_score"] >= 0.95

    def test_groq_ai_integration(self):
        """Test MVP requirement: Groq ultra-fast AI model integration"""
        response = client.get("/api/v1/status/")
        assert response.status_code == 200

        data = response.json()
        assert "ai_service" in data
        assert data["ai_service"]["provider"] == "groq"
        assert "openai/gpt-oss-120b" in data["ai_service"]["model"]

    def test_contract_generation_functionality(self):
        """Test MVP requirement: Plain English → Professional UK contracts"""
        import uuid

        # Register user and get auth
        unique_email = f"mvptest-{uuid.uuid4().hex[:8]}@example.com"
        user_data = {
            "email": unique_email,
            "password": "TestPassword123!",
            "full_name": "MVP Test User",
            "company_name": "MVP Test Company",
        }
        auth_response = client.post("/api/v1/auth/register", json=user_data)
        token = auth_response.json()["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create contract
        contract_data = {
            "title": "MVP Test Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "I need a contract for business consulting services",
        }

        create_response = client.post(
            "/api/v1/contracts/", json=contract_data, headers=headers
        )
        assert create_response.status_code == 201
        contract_id = create_response.json()["id"]

        # Generate contract content
        generate_response = client.post(
            f"/api/v1/contracts/{contract_id}/generate",
            json={"contract_id": contract_id},
            headers=headers,
        )

        assert generate_response.status_code == 200
        generation_data = generate_response.json()
        assert "generated_content" in generation_data
        # Verify it's a proper contract (should contain key UK legal elements)
        content = generation_data["generated_content"]
        assert any(
            term in content.upper() for term in ["AGREEMENT", "CONTRACT", "SERVICES"]
        )
        assert "UK" in content or "England" in content or "British" in content
        # Check it has some professional contract elements
        assert len(content) > 500  # Should be a substantial document

    def test_gdpr_compliance_features(self):
        """Test MVP requirement: GDPR compliance validation"""
        response = client.get("/api/v1/status/")
        assert response.status_code == 200

        data = response.json()
        assert data["compliance"]["gdpr"] is True

        # Check features list includes GDPR capabilities
        features_response = client.get("/api/v1/status/features")
        assert features_response.status_code == 200

        features = features_response.json()
        security_features = features.get("security", [])
        assert "gdpr_requests" in security_features

    def test_version_control_audit_trail(self):
        """Test MVP requirement: Version control with audit trail"""
        import uuid

        # Register user
        unique_email = f"versiontest-{uuid.uuid4().hex[:8]}@example.com"
        user_data = {
            "email": unique_email,
            "password": "TestPassword123!",
            "full_name": "Version Test User",
            "company_name": "Version Test Company",
        }
        auth_response = client.post("/api/v1/auth/register", json=user_data)
        token = auth_response.json()["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create and update a contract
        contract_data = {
            "title": "Version Test Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "Test contract for versioning",
        }

        create_response = client.post(
            "/api/v1/contracts/", json=contract_data, headers=headers
        )
        contract_id = create_response.json()["id"]

        # Update contract
        update_data = {"title": "Updated Version Test Contract"}
        client.put(
            f"/api/v1/contracts/{contract_id}", json=update_data, headers=headers
        )

        # Check version history exists
        versions_response = client.get(
            f"/api/v1/contracts/{contract_id}/versions", headers=headers
        )
        assert versions_response.status_code == 200
        # Note: This test assumes version history is created - may need implementation

    def test_risk_scoring_system(self):
        """Test MVP requirement: Contract risk scoring (1-10 scale)"""
        import uuid

        # Register user
        unique_email = f"risktest-{uuid.uuid4().hex[:8]}@example.com"
        user_data = {
            "email": unique_email,
            "password": "TestPassword123!",
            "full_name": "Risk Test User",
            "company_name": "Risk Test Company",
        }
        auth_response = client.post("/api/v1/auth/register", json=user_data)
        token = auth_response.json()["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create contract with content that can be analyzed
        contract_data = {
            "title": "Risk Test Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "I need a consulting services contract for business advisory services including strategic planning and operational improvements.",
        }

        create_response = client.post(
            "/api/v1/contracts/", json=contract_data, headers=headers
        )
        assert create_response.status_code == 201
        contract_id = create_response.json()["id"]

        # Generate contract content first
        generate_response = client.post(
            f"/api/v1/contracts/{contract_id}/generate",
            json={"contract_id": contract_id},
            headers=headers,
        )
        assert generate_response.status_code == 200

        # Analyze compliance/risk
        analyze_response = client.post(
            f"/api/v1/contracts/{contract_id}/analyze",
            json={"contract_id": contract_id, "force_reanalysis": True},
            headers=headers,
        )

        assert analyze_response.status_code == 200
        analysis_data = analyze_response.json()
        assert "risk_score" in analysis_data
        # Risk score should be between 1-10 as per MVP requirement
        assert 1 <= analysis_data["risk_score"] <= 10
        # Should have compliance scores
        assert "overall_score" in analysis_data
        assert 0 <= analysis_data["overall_score"] <= 1

    def test_performance_requirements(self):
        """Test MVP requirement: Performance standards"""
        import time

        # Test API response times
        start_time = time.time()
        response = client.get("/api/v1/status/")
        response_time = time.time() - start_time

        assert response.status_code == 200
        # API should respond within 2 seconds for basic endpoints
        assert response_time < 2.0, f"API response too slow: {response_time}s"

    def test_employment_law_compliance(self):
        """Test MVP requirement: UK employment law compliance checking"""
        response = client.get("/api/v1/status/")
        assert response.status_code == 200

        data = response.json()
        assert data["compliance"]["uk_employment_law"] is True

    def test_consumer_rights_compliance(self):
        """Test MVP requirement: Consumer rights compliance scoring"""
        response = client.get("/api/v1/status/")
        assert response.status_code == 200

        data = response.json()
        assert data["compliance"]["consumer_rights"] is True


class TestSecurityAndCompliance:
    """Test security and compliance features"""

    def test_data_isolation_between_companies(self):
        """Test that companies can only access their own data"""
        import uuid

        # Create two different companies/users
        unique_suffix1 = uuid.uuid4().hex[:8]
        unique_suffix2 = uuid.uuid4().hex[:8]

        user1_data = {
            "email": f"company1-{unique_suffix1}@example.com",
            "password": "TestPassword123!",
            "full_name": "Company 1 User",
            "company_name": "Company 1",
        }

        user2_data = {
            "email": f"company2-{unique_suffix2}@example.com",
            "password": "TestPassword123!",
            "full_name": "Company 2 User",
            "company_name": "Company 2",
        }

        # Register both users
        auth1 = client.post("/api/v1/auth/register", json=user1_data)
        auth2 = client.post("/api/v1/auth/register", json=user2_data)

        token1 = auth1.json()["token"]["access_token"]
        token2 = auth2.json()["token"]["access_token"]

        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create contract for company 1
        contract_data = {
            "title": "Company 1 Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "Private contract for company 1",
        }

        create_response = client.post(
            "/api/v1/contracts/", json=contract_data, headers=headers1
        )
        contract_id = create_response.json()["id"]

        # Company 1 can access their contract
        response1 = client.get(f"/api/v1/contracts/{contract_id}", headers=headers1)
        assert response1.status_code == 200

        # Company 2 cannot access company 1's contract
        response2 = client.get(f"/api/v1/contracts/{contract_id}", headers=headers2)
        assert response2.status_code == 403

    def test_input_validation(self):
        """Test API input validation and sanitization"""
        # Test invalid email format
        invalid_user_data = {
            "email": "invalid-email",
            "password": "TestPassword123!",
            "full_name": "Test User",
        }

        response = client.post("/api/v1/auth/register", json=invalid_user_data)
        assert response.status_code == 422  # Validation error

    def test_authentication_required(self):
        """Test that protected endpoints require authentication"""
        protected_endpoints = [
            "/api/v1/contracts/",
            "/api/v1/analytics/business",
            "/api/v1/auth/me",
        ]

        for endpoint in protected_endpoints:
            response = client.get(endpoint)
            assert (
                response.status_code == 401
            ), f"Endpoint {endpoint} should require auth"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
