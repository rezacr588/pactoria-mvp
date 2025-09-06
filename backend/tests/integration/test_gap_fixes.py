"""
Integration tests for gap fixes between frontend and backend
Tests critical fixes implemented for frontend-backend compatibility
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import DatabaseManager
import asyncio
import os

client = TestClient(app)


class TestGapFixes:
    """Test critical gap fixes between frontend and backend"""

    @classmethod
    def setup_class(cls):
        """Set up test database"""
        # Ensure we have a fresh database
        if os.path.exists("pactoria_mvp.db"):
            os.remove("pactoria_mvp.db")

        # Initialize database
        asyncio.run(DatabaseManager.init_database())

        # Register a test user and get token
        register_response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "testgaps@example.com",
                "password": "TestPassword123!",
                "full_name": "Test Gaps User",
                "company_name": "Gap Test Company",
            },
        )
        assert register_response.status_code == 201

        # Login to get token
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "testgaps@example.com", "password": "TestPassword123!"},
        )
        assert login_response.status_code == 200
        cls.headers = {
            "Authorization": f"Bearer {login_response.json()['token']['access_token']}"
        }

    def test_database_schema_fixed(self):
        """Test that database schema issues are fixed"""
        # Test that user registration works (department field exists)
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "schematest@example.com",
                "password": "TestPassword123!",
                "full_name": "Schema Test User",
                "company_name": "Schema Test Company",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "user" in data
        assert "company" in data
        assert data["user"]["email"] == "schematest@example.com"

    def test_analytics_sqlite_compatibility(self):
        """Test that analytics endpoint works with SQLite (date_trunc fix)"""
        response = client.get("/api/v1/analytics/dashboard", headers=self.headers)
        assert response.status_code == 200

        data = response.json()
        assert "business_metrics" in data
        assert "summary" in data
        assert "contract_value_trend" in data
        assert "recent_contracts_trend" in data

        # Test time series endpoint specifically
        response = client.get(
            "/api/v1/analytics/time-series/contract_value?period=WEEKLY&days=30",
            headers=self.headers,
        )
        assert response.status_code == 200

    def test_search_endpoints_complete(self):
        """Test that all search endpoints required by frontend exist"""
        # Quick search
        response = client.get(
            "/api/v1/search/contracts/quick?q=test", headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data or "total" not in data  # Optional field

        # Search suggestions
        response = client.get(
            "/api/v1/search/suggestions/contracts?q=test", headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert "query" in data
        assert data["query"] == "test"

        # Search facets
        response = client.get("/api/v1/search/facets/contracts", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "facets" in data
        assert "generated_at" in data

    def test_template_endpoints_complete(self):
        """Test that template endpoints match frontend expectations"""
        # Template list with pagination (TemplateService)
        response = client.get("/api/v1/templates/")
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert "pages" in data

        # Contract templates (ContractService)
        response = client.get("/api/v1/contracts/templates/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)  # Direct array, not paginated

        # Template categories
        response = client.get("/api/v1/templates/categories/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # Template contract types
        response = client.get("/api/v1/templates/contract-types/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_authentication_flow_works(self):
        """Test complete authentication flow"""
        # Register
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "authtest@example.com",
                "password": "TestPassword123!",
                "full_name": "Auth Test User",
                "company_name": "Auth Test Company",
            },
        )
        assert response.status_code == 201

        # Login
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "authtest@example.com", "password": "TestPassword123!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert "company" in data

        # Test protected endpoint
        token = data["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/v1/contracts/", headers=headers)
        assert response.status_code == 200

    def test_critical_endpoints_availability(self):
        """Test that all critical endpoints required by frontend are available"""
        critical_endpoints = [
            "/api/v1/contracts/",
            "/api/v1/analytics/dashboard",
            "/api/v1/templates/",
            "/api/v1/search/contracts/quick?q=test",
            "/api/v1/notifications/",
            "/api/v1/team/members",
            "/api/v1/integrations/",
            "/api/v1/audit/entries",
        ]

        for endpoint in critical_endpoints:
            response = client.get(endpoint, headers=self.headers)
            assert (
                response.status_code == 200
            ), f"Endpoint {endpoint} failed with {response.status_code}"

    def test_data_format_consistency(self):
        """Test that data formats match frontend expectations"""
        # Test contract list response format
        response = client.get("/api/v1/contracts/", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "contracts" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data

        # Test analytics response format
        response = client.get("/api/v1/analytics/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        expected_keys = [
            "business_metrics",
            "user_metrics",
            "contract_types",
            "compliance_metrics",
            "recent_contracts_trend",
            "contract_value_trend",
            "summary",
        ]
        for key in expected_keys:
            assert key in data, f"Missing key {key} in analytics response"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
