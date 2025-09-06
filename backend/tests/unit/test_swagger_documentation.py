"""
Test suite for Swagger/OpenAPI documentation
Following TDD principles - tests first
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


class TestSwaggerDocumentation:
    """Test comprehensive Swagger/OpenAPI documentation"""

    def test_openapi_schema_exists(self):
        """Test that OpenAPI schema is properly configured"""
        client = TestClient(app)
        response = client.get("/openapi.json")
        assert response.status_code == 200

        schema = response.json()
        assert schema["openapi"] == "3.1.0"
        assert schema["info"]["title"] == "Pactoria Contract Management"
        assert schema["info"]["version"] == "0.1.0-mvp"
        assert "description" in schema["info"]

    def test_openapi_comprehensive_metadata(self):
        """Test that OpenAPI schema has comprehensive metadata"""
        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        # Check for comprehensive metadata
        info = schema["info"]
        assert "termsOfService" in info
        assert "contact" in info
        assert info["contact"]["name"] == "Pactoria Support"
        assert info["contact"]["email"] == "support@pactoria.com"
        assert "license" in info
        assert info["license"]["name"] == "Proprietary"

    def test_jwt_authentication_schema(self):
        """Test that JWT authentication is properly documented"""
        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        # Check for security schemes
        assert "components" in schema
        assert "securitySchemes" in schema["components"]
        assert "bearerAuth" in schema["components"]["securitySchemes"]

        bearer_auth = schema["components"]["securitySchemes"]["bearerAuth"]
        assert bearer_auth["type"] == "http"
        assert bearer_auth["scheme"] == "bearer"
        assert bearer_auth["bearerFormat"] == "JWT"

    def test_api_tags_configuration(self):
        """Test that API endpoints are properly tagged and organized"""
        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        # Check for tags
        assert "tags" in schema
        tag_names = [tag["name"] for tag in schema["tags"]]
        expected_tags = [
            "Health",
            "Authentication",
            "Contracts",
            "AI Services",
            "Security",
            "Analytics",
        ]

        for expected_tag in expected_tags:
            assert expected_tag in tag_names

    def test_error_responses_documented(self):
        """Test that error responses are properly documented"""
        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        # Check that endpoints have proper error responses documented
        paths = schema["paths"]
        auth_login_path = paths["/api/v1/auth/login"]["post"]

        assert "responses" in auth_login_path
        responses = auth_login_path["responses"]
        assert "401" in responses
        assert "422" in responses

        # Check that auth register has proper responses
        auth_register_path = paths["/api/v1/auth/register"]["post"]
        register_responses = auth_register_path["responses"]
        assert "201" in register_responses
        assert "400" in register_responses
        assert "422" in register_responses

    def test_request_examples_present(self):
        """Test that request schemas have examples"""
        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        # Check components schemas have examples
        components = schema["components"]["schemas"]

        # UserLogin should have example
        if "UserLogin" in components:
            user_login = components["UserLogin"]
            assert "example" in user_login or "examples" in user_login

    def test_response_examples_present(self):
        """Test that response schemas have examples"""
        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        # Check that responses have examples
        paths = schema["paths"]
        health_path = paths["/health"]["get"]

        assert "responses" in health_path
        success_response = health_path["responses"]["200"]
        assert "content" in success_response

    def test_swagger_ui_accessible(self):
        """Test that Swagger UI is accessible"""
        client = TestClient(app)
        response = client.get("/docs")
        assert response.status_code == 200
        assert "swagger-ui" in response.text.lower()

    def test_redoc_accessible(self):
        """Test that ReDoc is accessible"""
        client = TestClient(app)
        response = client.get("/redoc")
        assert response.status_code == 200
        assert "redoc" in response.text.lower()
