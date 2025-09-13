"""
Integration tests for Contract API endpoints
Testing MVP requirements for contract generation and management APIs
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, Mock
import json

from app.main import app
from app.core.security import create_access_token


class TestContractAPI:
    """Integration tests for contract endpoints"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    @pytest.fixture
    def auth_headers(self):
        """Mock authentication headers"""
        # Mock user ID - in real tests this would be a valid user
        token = create_access_token(subject="test-user-id")
        return {"Authorization": f"Bearer {token}"}

    @pytest.fixture
    def mock_user(self, test_database):
        """Mock authenticated user with company"""
        from tests.conftest import create_test_company, create_test_user
        from sqlalchemy.orm import sessionmaker
        
        # Create session for the test database
        TestingSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=test_database
        )
        db = TestingSessionLocal()
        
        try:
            # Create test company
            company = create_test_company(db, name="Test Company")
            
            # Create test user with the same ID that the auth token uses
            user = create_test_user(
                db, 
                company_id=company.id,
                id="test-user-id",  # This must match the token
                email="test@example.com",
                full_name="Test User"
            )
            
            return user
        finally:
            db.close()

    def test_contract_generation_endpoint_success(self, client, auth_headers, mock_user, valid_contract_request):
        """Test successful contract generation via API"""
        # Override the dependency to return mock user
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: mock_user

        try:
            with patch("app.api.v1.contracts.ai_service") as mock_ai_service:
                # Mock AI service response to match the expected structure
                mock_ai_response = Mock()
                mock_ai_response.content = "GENERATED_CONTRACT_CONTENT"
                mock_ai_response.model_name = "llama3-70b-8192"
                mock_ai_response.model_version = "v1.0"
                mock_ai_response.processing_time_ms = 1500
                mock_ai_response.token_usage = {"prompt_tokens": 150, "completion_tokens": 800}
                mock_ai_response.confidence_score = 0.85
                
                mock_ai_service.generate_contract = AsyncMock(return_value=mock_ai_response)

                # Make request with authentication
                response = client.post(
                    "/api/v1/contracts/generate", 
                    json=valid_contract_request,
                    headers=auth_headers
                )

                # Assertions - should be 201 for creation
                assert response.status_code == 201
                data = response.json()

                assert "contract" in data
                assert "ai_generation" in data
                assert "processing_time_ms" in data
                assert "message" in data

                contract = data["contract"]
                assert contract["title"] == valid_contract_request["title"]
                assert contract["contract_type"] == valid_contract_request["contract_type"]
                assert contract["status"] == "draft"
                assert contract["version"] == 1
                assert "generated_content" in contract
        finally:
            # Clean up dependency override
            app.dependency_overrides.clear()

    def test_contract_generation_invalid_request(
        self, client, auth_headers, mock_user, invalid_contract_request
    ):
        """Test contract generation with invalid request data"""
        # Override the dependency to return mock user
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: mock_user

        try:
            response = client.post(
                "/api/v1/contracts/generate", 
                json=invalid_contract_request,
                headers=auth_headers
            )

            # Should return 422 for validation errors
            assert response.status_code == 422
            error_data = response.json()
            assert "detail" in error_data
        finally:
            # Clean up dependency override
            app.dependency_overrides.clear()

    def test_contract_generation_ai_service_failure(
        self, client, auth_headers, mock_user, valid_contract_request
    ):
        """Test handling of AI service failures"""
        with patch("app.api.v1.contracts.ai_service") as mock_ai_service, \
             patch("app.api.v1.contracts.get_current_user", return_value=mock_user):
            
            mock_ai_service.generate_contract = AsyncMock(
                side_effect=Exception("AI service unavailable")
            )

            response = client.post(
                "/api/v1/contracts/generate", 
                json=valid_contract_request,
                headers=auth_headers
            )

            assert response.status_code == 500
            error_data = response.json()
            assert "detail" in error_data
            assert "Failed to generate contract content" in error_data["detail"]

    def test_list_contracts_endpoint(self, client, auth_headers, mock_user, test_database):
        """Test contract listing endpoint"""
        with patch("app.api.v1.contracts.get_current_user", return_value=mock_user):
            response = client.get("/api/v1/contracts/", headers=auth_headers)

            assert response.status_code == 200
        data = response.json()

        assert "contracts" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data  # Fixed: should be "size" not "per_page"
        assert "pages" in data

        # Default pagination
        assert data["page"] == 1
        assert data["size"] == 10  # Fixed: default size is 10, not 20

    def test_list_contracts_with_filters(self, client, auth_headers, mock_user, test_database):
        """Test contract listing with filters"""
        # Test type filter
        response = client.get(
            "/api/v1/contracts/", 
            params={"contract_type": "service_agreement"},
            headers=auth_headers
        )
        assert response.status_code == 200

        # Test status filter
        response = client.get(
            "/api/v1/contracts/", 
            params={"status": "draft"},
            headers=auth_headers
        )
        assert response.status_code == 200

        # Test pagination
        response = client.get(
            "/api/v1/contracts/", 
            params={"page": 2, "size": 10},  # Fixed: use "size" not "per_page"
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 2
        assert data["size"] == 10  # Fixed: use "size" not "per_page"

    def test_get_contract_by_id(self, client, auth_headers, mock_user, test_database):
        """Test retrieving specific contract"""
        contract_id = "test-contract-id"
        response = client.get(f"/api/v1/contracts/{contract_id}", headers=auth_headers)

        # This will return 404 since contract doesn't exist, but auth should work
        assert response.status_code in [200, 404]

    def test_get_contract_not_found(self, client, auth_headers, mock_user, test_database):
        """Test retrieving non-existent contract"""
        response = client.get("/api/v1/contracts/non-existent-id", headers=auth_headers)

        # Should return 404 for non-existent contract
        assert response.status_code == 404

    def test_update_contract_endpoint(self, client, auth_headers, mock_user, test_database):
        """Test contract update endpoint"""
        contract_id = "test-contract-id"
        update_data = {
            "title": "Updated Contract Title",
            "status": "active",
        }

        response = client.put(
            f"/api/v1/contracts/{contract_id}", 
            json=update_data,
            headers=auth_headers
        )

        # Should return 404 since contract doesn't exist
        assert response.status_code in [200, 404]

    def test_delete_contract_endpoint(self, client, auth_headers, mock_user, test_database):
        """Test contract deletion endpoint"""
        contract_id = "test-contract-id"

        response = client.delete(f"/api/v1/contracts/{contract_id}", headers=auth_headers)

        # Should return 404 since contract doesn't exist, but 204 if it did
        assert response.status_code in [204, 404]

    def test_contract_wizard_step1_validation(self, client):
        """Test contract wizard step 1 validation"""
        step1_data = {
            "contract_type": "service_agreement",
            "title": "Test Contract",
            "parties": ["Company A", "Company B"],
        }

        response = client.post(
            "/api/v1/contracts/wizard/validate-step1", json=step1_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["next_step"] == "step2"

    def test_contract_wizard_step2_validation_success(self, client):
        """Test contract wizard step 2 validation success"""
        step2_data = {
            "plain_english_input": "I need a professional services contract with monthly payment terms and confidentiality clauses for consulting work",
            "contract_value": 50000.00,
            "contract_duration": "12 months",
        }

        response = client.post(
            "/api/v1/contracts/wizard/validate-step2", json=step2_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["next_step"] == "step3"

    def test_contract_wizard_step2_validation_failure(self, client):
        """Test contract wizard step 2 validation failure"""
        step2_data = {
            "plain_english_input": "Too short",  # Less than 50 characters
            "contract_value": 10000.00,
        }

        response = client.post(
            "/api/v1/contracts/wizard/validate-step2", json=step2_data
        )

        assert response.status_code == 400
        error_data = response.json()
        assert "too short" in error_data["detail"]

    def test_complete_contract_wizard(self, client):
        """Test complete contract wizard workflow"""
        with patch("app.api.v1.contracts.ai_service") as mock_ai_service:
            # Mock AI service
            mock_ai_service.generate_contract = AsyncMock(
                return_value=("WIZARD_GENERATED_CONTENT", {"processing_time_ms": 2000})
            )
            mock_ai_service.validate_contract_compliance = AsyncMock(
                return_value={"overall_score": 0.94, "risk_score": 2}
            )

            wizard_data = {
                "step1": {
                    "contract_type": "service_agreement",
                    "title": "Wizard Contract",
                    "parties": ["Client Corp", "Service Provider"],
                },
                "step2": {
                    "plain_english_input": "Professional consulting services with monthly billing and IP ownership terms",
                    "contract_value": 25000.00,
                    "contract_duration": "6 months",
                },
                "step3": {
                    "compliance_level": "standard",
                    "include_gdpr_clauses": True,
                    "include_termination_clauses": True,
                },
            }

            response = client.post(
                "/api/v1/contracts/wizard/complete", json=wizard_data
            )

            assert response.status_code == 200
            data = response.json()

            assert "contract" in data
            contract = data["contract"]
            assert contract["title"] == wizard_data["step1"]["title"]
            assert contract["contract_type"] == wizard_data["step1"]["contract_type"]

    def test_get_contract_versions(self, client, auth_headers, mock_user, test_database):
        """Test retrieving contract version history"""
        contract_id = "test-contract-id"

        response = client.get(f"/api/v1/contracts/{contract_id}/versions", headers=auth_headers)

        # Should return 404 since contract doesn't exist, but would return list if it did
        assert response.status_code in [200, 404]

    def test_export_contract_pdf(self, client):
        """Test contract PDF export"""
        contract_id = "test-contract-id"

        response = client.get(f"/api/v1/contracts/{contract_id}/export/pdf")

        assert response.status_code == 200
        data = response.json()

        assert "download_url" in data
        assert "filename" in data
        assert "message" in data
        assert data["filename"] == f"contract_{contract_id}.pdf"
        assert "PDF generated successfully" in data["message"]

    def test_contract_generation_with_all_parameters(self, client, auth_headers, mock_user, test_database):
        """Test contract generation with all optional parameters"""
        comprehensive_request = {
            "title": "Comprehensive Test Contract",
            "contract_type": "consultancy",
            "plain_english_input": "Detailed consulting agreement with specific deliverables, milestones, and payment schedule. Include IP ownership, confidentiality, and termination clauses.",
            "company_details": {
                "name": "Test Consulting Ltd",
                "registration_number": "87654321",
                "address": "456 Business Ave, Manchester, UK",
            },
            "contract_value": 75000.00,
            "contract_duration": "18 months",
            "parties": [
                "Test Consulting Ltd",
                "Client Manufacturing Corp",
                "Third Party Vendor",
            ],
            "compliance_level": "strict",
        }

        # Override the auth dependency (database is already overridden by conftest.py)
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: mock_user

        try:
            with patch("app.api.v1.contracts.ai_service") as mock_ai_service:
                mock_ai_service.generate_contract = AsyncMock(
                    return_value=(
                        "COMPREHENSIVE_CONTRACT_CONTENT",
                        {"processing_time_ms": 2500},
                    )
                )
                mock_ai_service.validate_contract_compliance = AsyncMock(
                    return_value={"overall_score": 0.96, "risk_score": 2}
                )

                response = client.post(
                    "/api/v1/contracts/generate", 
                    json=comprehensive_request,
                    headers=auth_headers
                )

                assert response.status_code == 200
                data = response.json()

                contract = data["contract"]
                assert contract["title"] == comprehensive_request["title"]
                assert contract["contract_type"] == comprehensive_request["contract_type"]

                # Verify AI service was called with correct parameters
                mock_ai_service.generate_contract.assert_called_once()
                call_args = mock_ai_service.generate_contract.call_args[1]
                assert call_args["compliance_level"] == "strict"
                assert (
                    call_args["company_details"] == comprehensive_request["company_details"]
                )
        finally:
            # Only clear the auth override, leave database as is
            if get_current_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_user]

    @pytest.mark.parametrize(
        "contract_type",
        [
            "service_agreement",
            "employment_contract",
            "supplier_agreement",
            "nda",
            "terms_conditions",
            "consultancy",
        ],
    )
    def test_contract_generation_all_types(self, client, auth_headers, mock_user, contract_type):
        """Test contract generation for all supported contract types"""
        request_data = {
            "title": f"Test {contract_type.replace('_', ' ').title()}",
            "contract_type": contract_type,
            "plain_english_input": f"I need a {contract_type.replace('_', ' ')} with standard terms and conditions",
            "compliance_level": "standard",
        }

        # Override the auth dependency
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: mock_user

        try:
            with patch("app.api.v1.contracts.ai_service") as mock_ai_service:
                mock_ai_service.generate_contract = AsyncMock(
                    return_value=(
                        f"GENERATED_{contract_type.upper()}_CONTENT",
                        {"processing_time_ms": 1500},
                    )
                )
                mock_ai_service.validate_contract_compliance = AsyncMock(
                    return_value={"overall_score": 0.90, "risk_score": 4}
                )

                response = client.post(
                    "/api/v1/contracts/generate", 
                    json=request_data,
                    headers=auth_headers
                )

                assert response.status_code == 200
                data = response.json()
                assert data["contract"]["contract_type"] == contract_type
        finally:
            # Only clear the auth override, leave database as is
            if get_current_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_user]

    def test_api_error_handling(self, client, auth_headers, mock_user):
        """Test API error handling and response formats"""
        # Override the auth dependency
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: mock_user

        try:
            # Test malformed JSON
            response = client.post(
                "/api/v1/contracts/generate",
                data="invalid json",
                headers={"Content-Type": "application/json", **auth_headers},
            )
            assert response.status_code == 422

            # Test missing required fields
            response = client.post(
                "/api/v1/contracts/generate", 
                json={},
                headers=auth_headers
            )
            assert response.status_code == 422

            # Test invalid enum values
            response = client.post(
                "/api/v1/contracts/generate",
                json={
                    "title": "Test",
                    "contract_type": "invalid_type",
                    "plain_english_input": "test input",
                },
                headers=auth_headers
            )
            assert response.status_code == 422
        finally:
            # Only clear the auth override, leave database as is
            if get_current_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_user]

    def test_response_schemas_compliance(self, client, auth_headers, mock_user, valid_contract_request):
        """Test that API responses match defined schemas"""
        # Override the auth dependency
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: mock_user

        try:
            with patch("app.api.v1.contracts.ai_service") as mock_ai_service:
                mock_ai_service.generate_contract = AsyncMock(
                    return_value=(
                        "CONTRACT_CONTENT",
                        {
                            "model_used": "llama3-70b-8192",
                            "processing_time_ms": 1500,
                            "prompt_tokens": 150,
                            "completion_tokens": 800,
                            "confidence_score": 0.85,
                            "input_prompt": "test prompt",
                        },
                    )
                )

                mock_ai_service.validate_contract_compliance = AsyncMock(
                    return_value={
                        "overall_score": 0.92,
                        "gdpr_compliance": 0.95,
                        "risk_score": 3,
                        "risk_factors": ["test"],
                        "recommendations": ["test rec"],
                        "validation_method": "ai",
                    }
                )

                response = client.post(
                    "/api/v1/contracts/generate", 
                    json=valid_contract_request,
                    headers=auth_headers
                )

                assert response.status_code == 200
        finally:
            # Only clear the auth override, leave database as is
            if get_current_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_user]
            data = response.json()

            # Verify response structure matches ContractGenerationResponse schema
            required_fields = ["contract", "processing_time_ms", "message"]
            for field in required_fields:
                assert field in data

            # Verify contract structure matches ContractResponse schema
            contract = data["contract"]
            contract_fields = [
                "id",
                "title",
                "contract_type",
                "status",
                "version",
                "plain_english_input",
                "generated_content",
                "created_by",
                "company_id",
                "created_at",
                "updated_at",
            ]
            for field in contract_fields:
                assert field in contract
