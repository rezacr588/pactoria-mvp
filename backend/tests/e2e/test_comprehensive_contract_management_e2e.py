"""
Comprehensive End-to-End Contract Management Tests for Pactoria MVP

Tests the complete contract lifecycle from creation to archival,
including AI generation, compliance analysis, version management, and file operations.

Following TDD principles - comprehensive testing for maximum coverage.
"""

import pytest
import uuid
import json
import io
from datetime import datetime, timedelta
from typing import Dict, Any, List
from unittest.mock import patch, AsyncMock, Mock

from fastapi import status, UploadFile
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.security import create_access_token
from app.infrastructure.database.models import (
    User, Company, Contract, Template, AIGeneration, ComplianceScore, 
    ContractVersion, ContractStatus, ContractType, SubscriptionTier, UserRole
)
from app.services.ai_service import GroqAIService
from tests.conftest import create_test_company, create_test_user


class TestComprehensiveContractManagementE2E:
    """Comprehensive contract management E2E tests"""

    @pytest.fixture
    def authenticated_user(self, db_session: Session):
        """Create authenticated user for tests"""
        company = create_test_company(db_session)
        user = create_test_user(db_session, company.id, role=UserRole.CONTRACT_MANAGER)
        token = create_access_token(data={"sub": user.email})
        headers = {"Authorization": f"Bearer {token}"}
        return user, company, headers

    def test_complete_ai_contract_generation_flow(self, client: TestClient, db_session: Session, authenticated_user):
        """Test complete AI-powered contract generation workflow"""
        user, company, headers = authenticated_user
        
        # Arrange
        contract_request = {
            "title": "Professional Services Agreement - E2E Test",
            "contract_type": "service_agreement",
            "plain_english_input": "I need a comprehensive service agreement for consulting work. The contract should include payment terms of 30 days, confidentiality clauses, IP ownership terms, and termination conditions. The work involves business analysis and strategic recommendations.",
            "company_details": {
                "name": company.name,
                "registration_number": company.registration_number,
                "address": company.address
            },
            "compliance_level": "enhanced"
        }

        # Mock AI service response
        mock_contract_content = """
PROFESSIONAL SERVICES AGREEMENT

This Professional Services Agreement ("Agreement") is entered into on [DATE] between:

CLIENT: {company_name}, a company incorporated in England and Wales
SERVICE PROVIDER: [PROVIDER_NAME]

1. SERVICES
The Service Provider shall provide business analysis and strategic recommendations services.

2. PAYMENT TERMS
Payment is due within thirty (30) days of invoice date.

3. CONFIDENTIALITY
Both parties acknowledge they may have access to confidential information and agree to maintain strict confidentiality.

4. INTELLECTUAL PROPERTY
All work product created shall be the exclusive property of Client.

5. TERMINATION
Either party may terminate this agreement with 30 days written notice.

6. GOVERNING LAW
This Agreement shall be governed by the laws of England and Wales.
        """.strip()

        mock_ai_metadata = {
            "model_used": "llama3-70b-8192",
            "processing_time_ms": 2500,
            "prompt_tokens": 200,
            "completion_tokens": 1500,
            "total_tokens": 1700,
            "confidence_score": 0.92
        }

        with patch('app.services.ai_service.GroqAIService.generate_contract') as mock_generate:
            mock_generate.return_value = (mock_contract_content, mock_ai_metadata)
            
            # Act
            response = client.post("/api/v1/contracts/generate", json=contract_request, headers=headers)

        # Assert
        assert response.status_code == status.HTTP_201_CREATED
        contract_data = response.json()
        
        # Verify contract data structure
        assert "id" in contract_data
        assert contract_data["title"] == contract_request["title"]
        assert contract_data["contract_type"] == contract_request["contract_type"]
        assert contract_data["status"] == ContractStatus.DRAFT.value
        assert contract_data["version"] == 1
        assert contract_data["content"] == mock_contract_content
        
        # Verify AI generation metadata
        assert "ai_generation" in contract_data
        ai_gen = contract_data["ai_generation"]
        assert ai_gen["model_used"] == "llama3-70b-8192"
        assert ai_gen["confidence_score"] == 0.92
        
        # Verify database record
        contract_id = contract_data["id"]
        db_contract = db_session.query(Contract).filter(Contract.id == contract_id).first()
        assert db_contract is not None
        assert db_contract.company_id == company.id
        assert db_contract.created_by == user.id

    def test_contract_crud_operations_flow(self, client: TestClient, db_session: Session, authenticated_user):
        """Test complete CRUD operations on contracts"""
        user, company, headers = authenticated_user
        
        # CREATE
        contract_data = {
            "title": "Test Contract CRUD",
            "contract_type": "employment_agreement",
            "content": "Test contract content for CRUD operations",
            "metadata": {"test": "crud_operations"}
        }
        
        create_response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        created_contract = create_response.json()
        contract_id = created_contract["id"]
        
        # READ - Get single contract
        get_response = client.get(f"/api/v1/contracts/{contract_id}", headers=headers)
        assert get_response.status_code == status.HTTP_200_OK
        retrieved_contract = get_response.json()
        assert retrieved_contract["title"] == contract_data["title"]
        assert retrieved_contract["content"] == contract_data["content"]
        
        # READ - List contracts
        list_response = client.get("/api/v1/contracts/", headers=headers)
        assert list_response.status_code == status.HTTP_200_OK
        contracts_list = list_response.json()
        assert "items" in contracts_list
        assert len(contracts_list["items"]) >= 1
        assert any(c["id"] == contract_id for c in contracts_list["items"])
        
        # UPDATE
        update_data = {
            "title": "Updated Test Contract CRUD",
            "content": "Updated contract content for CRUD operations",
            "metadata": {"test": "crud_operations_updated"}
        }
        
        update_response = client.put(f"/api/v1/contracts/{contract_id}", json=update_data, headers=headers)
        assert update_response.status_code == status.HTTP_200_OK
        updated_contract = update_response.json()
        assert updated_contract["title"] == update_data["title"]
        assert updated_contract["content"] == update_data["content"]
        assert updated_contract["version"] == 2  # Version should increment
        
        # DELETE
        delete_response = client.delete(f"/api/v1/contracts/{contract_id}", headers=headers)
        assert delete_response.status_code == status.HTTP_200_OK
        
        # Verify deletion
        get_deleted_response = client.get(f"/api/v1/contracts/{contract_id}", headers=headers)
        assert get_deleted_response.status_code == status.HTTP_404_NOT_FOUND

    def test_contract_compliance_analysis_flow(self, client: TestClient, db_session: Session, authenticated_user):
        """Test compliance analysis workflow"""
        user, company, headers = authenticated_user
        
        # Create a contract first
        contract_data = {
            "title": "Contract for Compliance Analysis",
            "contract_type": "service_agreement",
            "content": "This is a service agreement with various terms and conditions that need compliance analysis."
        }
        
        create_response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
        contract_id = create_response.json()["id"]
        
        # Mock compliance analysis response
        mock_compliance_result = {
            "overall_score": 0.87,
            "gdpr_compliance": 0.90,
            "employment_law_compliance": 0.85,
            "consumer_rights_compliance": 0.88,
            "commercial_terms_compliance": 0.86,
            "risk_score": 4,
            "risk_factors": [
                "Some GDPR clauses could be more specific",
                "Termination terms need clarification"
            ],
            "recommendations": [
                "Add explicit GDPR data processing clauses",
                "Clarify notice period for termination",
                "Include dispute resolution mechanism"
            ],
            "analysis_raw": "Detailed compliance analysis...",
            "validation_method": "ai"
        }
        
        with patch('app.services.ai_service.GroqAIService.validate_contract_compliance') as mock_validate:
            mock_validate.return_value = mock_compliance_result
            
            # Act - Request compliance analysis
            analysis_response = client.post(f"/api/v1/contracts/{contract_id}/analyze", headers=headers)
        
        # Assert
        assert analysis_response.status_code == status.HTTP_200_OK
        analysis_data = analysis_response.json()
        
        assert analysis_data["overall_score"] == 0.87
        assert analysis_data["gdpr_compliance"] == 0.90
        assert len(analysis_data["recommendations"]) == 3
        assert "GDPR" in analysis_data["recommendations"][0]
        
        # Verify compliance score is stored in database
        db_compliance = db_session.query(ComplianceScore).filter(
            ComplianceScore.contract_id == contract_id
        ).first()
        assert db_compliance is not None
        assert db_compliance.overall_score == 0.87

    def test_contract_version_management_flow(self, client: TestClient, db_session: Session, authenticated_user):
        """Test contract version management and history"""
        user, company, headers = authenticated_user
        
        # Create initial contract
        initial_contract = {
            "title": "Version Management Test Contract",
            "contract_type": "service_agreement",
            "content": "Initial version of the contract content"
        }
        
        create_response = client.post("/api/v1/contracts/", json=initial_contract, headers=headers)
        contract_id = create_response.json()["id"]
        
        # Make multiple updates to create versions
        updates = [
            {"content": "Updated version 2 with new terms"},
            {"content": "Updated version 3 with revised clauses"},
            {"content": "Final version 4 with all changes"}
        ]
        
        for i, update in enumerate(updates, start=2):
            update_response = client.put(f"/api/v1/contracts/{contract_id}", json=update, headers=headers)
            assert update_response.status_code == status.HTTP_200_OK
            assert update_response.json()["version"] == i
        
        # Get version history
        history_response = client.get(f"/api/v1/contracts/{contract_id}/versions", headers=headers)
        assert history_response.status_code == status.HTTP_200_OK
        
        versions = history_response.json()["items"]
        assert len(versions) == 4  # Initial + 3 updates
        
        # Verify version ordering (latest first)
        assert versions[0]["version_number"] == 4
        assert versions[-1]["version_number"] == 1
        
        # Get specific version
        version_2_response = client.get(f"/api/v1/contracts/{contract_id}/versions/2", headers=headers)
        assert version_2_response.status_code == status.HTTP_200_OK
        version_2_data = version_2_response.json()
        assert version_2_data["content"] == "Updated version 2 with new terms"
        
        # Revert to previous version
        revert_response = client.post(f"/api/v1/contracts/{contract_id}/revert/2", headers=headers)
        assert revert_response.status_code == status.HTTP_200_OK
        
        # Verify revert created new version with old content
        current_response = client.get(f"/api/v1/contracts/{contract_id}", headers=headers)
        current_contract = current_response.json()
        assert current_contract["version"] == 5
        assert current_contract["content"] == "Updated version 2 with new terms"

    def test_contract_file_upload_and_processing(self, client: TestClient, db_session: Session, authenticated_user):
        """Test contract file upload and processing workflow"""
        user, company, headers = authenticated_user
        
        # Create a test file content
        test_contract_content = """
        CONTRACT AGREEMENT
        
        This agreement is between Party A and Party B.
        Terms and conditions apply.
        
        Signed on [DATE]
        """
        
        # Create file-like object
        file_data = io.BytesIO(test_contract_content.encode('utf-8'))
        
        # Upload file
        files = {"file": ("test_contract.txt", file_data, "text/plain")}
        upload_data = {
            "title": "Uploaded Contract Test",
            "contract_type": "other"
        }
        
        upload_response = client.post(
            "/api/v1/contracts/upload", 
            files=files, 
            data=upload_data,
            headers={"Authorization": headers["Authorization"]}  # Can't use headers with files
        )
        
        # Assert upload success
        assert upload_response.status_code == status.HTTP_201_CREATED
        uploaded_contract = upload_response.json()
        
        assert uploaded_contract["title"] == "Uploaded Contract Test"
        assert "CONTRACT AGREEMENT" in uploaded_contract["content"]
        assert uploaded_contract["original_filename"] == "test_contract.txt"
        
        contract_id = uploaded_contract["id"]
        
        # Test file download
        download_response = client.get(f"/api/v1/contracts/{contract_id}/download", headers=headers)
        assert download_response.status_code == status.HTTP_200_OK
        assert "content-disposition" in download_response.headers
        assert "attachment" in download_response.headers["content-disposition"]

    def test_bulk_contract_operations(self, client: TestClient, db_session: Session, authenticated_user):
        """Test bulk operations on contracts"""
        user, company, headers = authenticated_user
        
        # Create multiple contracts for bulk operations
        contract_ids = []
        for i in range(5):
            contract_data = {
                "title": f"Bulk Operation Test Contract {i+1}",
                "contract_type": "service_agreement",
                "content": f"Content for contract {i+1}"
            }
            
            response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
            contract_ids.append(response.json()["id"])
        
        # Test bulk update
        bulk_update_data = {
            "operation_type": "update",
            "contract_ids": contract_ids[:3],
            "update_data": {
                "metadata": {"bulk_updated": True, "updated_at": datetime.utcnow().isoformat()}
            }
        }
        
        bulk_update_response = client.post("/api/v1/contracts/bulk", json=bulk_update_data, headers=headers)
        assert bulk_update_response.status_code == status.HTTP_200_OK
        
        bulk_result = bulk_update_response.json()
        assert bulk_result["successful_items"] == 3
        assert bulk_result["failed_items"] == 0
        assert bulk_result["status"] == "completed"
        
        # Test bulk archive
        bulk_archive_data = {
            "operation_type": "archive",
            "contract_ids": contract_ids[3:]
        }
        
        bulk_archive_response = client.post("/api/v1/contracts/bulk", json=bulk_archive_data, headers=headers)
        assert bulk_archive_response.status_code == status.HTTP_200_OK
        
        # Verify archived contracts are not in main listing
        list_response = client.get("/api/v1/contracts/", headers=headers)
        active_contracts = list_response.json()["items"]
        archived_contract_ids = set(contract_ids[3:])
        active_contract_ids = {c["id"] for c in active_contracts}
        
        # Archived contracts should not appear in active list
        assert not archived_contract_ids.intersection(active_contract_ids)

    def test_contract_search_and_filtering(self, client: TestClient, db_session: Session, authenticated_user):
        """Test advanced search and filtering functionality"""
        user, company, headers = authenticated_user
        
        # Create contracts with different attributes for testing search
        test_contracts = [
            {
                "title": "Service Agreement Alpha",
                "contract_type": "service_agreement",
                "content": "This is a service agreement with specific terms",
                "metadata": {"priority": "high", "department": "sales"}
            },
            {
                "title": "Employment Contract Beta",
                "contract_type": "employment_agreement",
                "content": "Employment terms and conditions for new hire",
                "metadata": {"priority": "medium", "department": "hr"}
            },
            {
                "title": "Service Agreement Gamma",
                "contract_type": "service_agreement",
                "content": "Another service agreement with different scope",
                "metadata": {"priority": "low", "department": "sales"}
            }
        ]
        
        created_contracts = []
        for contract_data in test_contracts:
            response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
            created_contracts.append(response.json())
        
        # Test text search
        search_response = client.get(
            "/api/v1/contracts/search?query=service agreement", 
            headers=headers
        )
        assert search_response.status_code == status.HTTP_200_OK
        search_results = search_response.json()["items"]
        assert len(search_results) == 2  # Two service agreements
        
        # Test filtering by contract type
        filter_response = client.get(
            "/api/v1/contracts/?contract_type=employment_agreement",
            headers=headers
        )
        assert filter_response.status_code == status.HTTP_200_OK
        filtered_results = filter_response.json()["items"]
        employment_contracts = [c for c in filtered_results if c["contract_type"] == "employment_agreement"]
        assert len(employment_contracts) >= 1
        
        # Test combined search and filter
        combined_response = client.get(
            "/api/v1/contracts/search?query=agreement&contract_type=service_agreement",
            headers=headers
        )
        assert combined_response.status_code == status.HTTP_200_OK
        combined_results = combined_response.json()["items"]
        assert all(c["contract_type"] == "service_agreement" for c in combined_results)

    def test_contract_export_functionality(self, client: TestClient, db_session: Session, authenticated_user):
        """Test contract export in various formats"""
        user, company, headers = authenticated_user
        
        # Create test contracts
        for i in range(3):
            contract_data = {
                "title": f"Export Test Contract {i+1}",
                "contract_type": "service_agreement",
                "content": f"Content for export test contract {i+1}"
            }
            client.post("/api/v1/contracts/", json=contract_data, headers=headers)
        
        # Test CSV export
        csv_export_response = client.get("/api/v1/contracts/export?format=csv", headers=headers)
        assert csv_export_response.status_code == status.HTTP_200_OK
        assert "text/csv" in csv_export_response.headers.get("content-type", "")
        
        # Test JSON export
        json_export_response = client.get("/api/v1/contracts/export?format=json", headers=headers)
        assert json_export_response.status_code == status.HTTP_200_OK
        assert "application/json" in json_export_response.headers.get("content-type", "")
        
        export_data = json_export_response.json()
        assert "contracts" in export_data
        assert len(export_data["contracts"]) >= 3

    def test_contract_template_integration(self, client: TestClient, db_session: Session, authenticated_user):
        """Test contract generation from templates"""
        user, company, headers = authenticated_user
        
        # First, create a template
        template_data = {
            "name": "Standard Service Agreement Template",
            "category": "service_agreement",
            "content": "TEMPLATE: Service Agreement between {{client_name}} and {{provider_name}}. Terms: {{payment_terms}}",
            "variables": ["client_name", "provider_name", "payment_terms"],
            "is_active": True
        }
        
        template_response = client.post("/api/v1/templates/", json=template_data, headers=headers)
        assert template_response.status_code == status.HTTP_201_CREATED
        template_id = template_response.json()["id"]
        
        # Generate contract from template
        contract_from_template_data = {
            "title": "Contract from Template Test",
            "template_id": template_id,
            "variables": {
                "client_name": "ABC Corp",
                "provider_name": "XYZ Services",
                "payment_terms": "Net 30 days"
            }
        }
        
        contract_response = client.post(
            "/api/v1/contracts/from-template", 
            json=contract_from_template_data, 
            headers=headers
        )
        
        assert contract_response.status_code == status.HTTP_201_CREATED
        generated_contract = contract_response.json()
        
        # Verify template variables were replaced
        assert "ABC Corp" in generated_contract["content"]
        assert "XYZ Services" in generated_contract["content"]
        assert "Net 30 days" in generated_contract["content"]
        assert "{{" not in generated_contract["content"]  # No unreplaced variables

    def test_contract_collaboration_features(self, client: TestClient, db_session: Session, authenticated_user):
        """Test contract collaboration features (comments, reviews)"""
        user, company, headers = authenticated_user
        
        # Create a contract for collaboration testing
        contract_data = {
            "title": "Collaboration Test Contract",
            "contract_type": "service_agreement",
            "content": "Contract content for collaboration testing"
        }
        
        response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
        contract_id = response.json()["id"]
        
        # Add comment to contract
        comment_data = {
            "content": "This clause needs review for compliance",
            "section": "payment_terms",
            "line_number": 15
        }
        
        comment_response = client.post(
            f"/api/v1/contracts/{contract_id}/comments", 
            json=comment_data, 
            headers=headers
        )
        assert comment_response.status_code == status.HTTP_201_CREATED
        
        # Get contract comments
        comments_response = client.get(f"/api/v1/contracts/{contract_id}/comments", headers=headers)
        assert comments_response.status_code == status.HTTP_200_OK
        comments = comments_response.json()["items"]
        assert len(comments) >= 1
        assert comments[0]["content"] == comment_data["content"]
        
        # Request review
        review_request = {
            "reviewer_email": user.email,  # Self-review for testing
            "message": "Please review this contract for legal compliance",
            "deadline": (datetime.utcnow() + timedelta(days=3)).isoformat()
        }
        
        review_response = client.post(
            f"/api/v1/contracts/{contract_id}/request-review",
            json=review_request,
            headers=headers
        )
        assert review_response.status_code == status.HTTP_200_OK

    def test_contract_security_and_permissions(self, client: TestClient, db_session: Session):
        """Test contract access control and security"""
        # Create two separate companies and users
        company1 = create_test_company(db_session, name="Company 1")
        company2 = create_test_company(db_session, name="Company 2")
        
        user1 = create_test_user(db_session, company1.id)
        user2 = create_test_user(db_session, company2.id)
        
        token1 = create_access_token(data={"sub": user1.email})
        token2 = create_access_token(data={"sub": user2.email})
        
        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}
        
        # User 1 creates a contract
        contract_data = {
            "title": "Security Test Contract",
            "contract_type": "service_agreement",
            "content": "Sensitive contract content"
        }
        
        response1 = client.post("/api/v1/contracts/", json=contract_data, headers=headers1)
        contract_id = response1.json()["id"]
        
        # User 2 should not be able to access User 1's contract
        unauthorized_response = client.get(f"/api/v1/contracts/{contract_id}", headers=headers2)
        assert unauthorized_response.status_code == status.HTTP_404_NOT_FOUND
        
        # User 2 should not be able to modify User 1's contract
        update_data = {"title": "Hacked Contract"}
        hack_response = client.put(f"/api/v1/contracts/{contract_id}", json=update_data, headers=headers2)
        assert hack_response.status_code == status.HTTP_404_NOT_FOUND
        
        # User 1 should still have access to their contract
        authorized_response = client.get(f"/api/v1/contracts/{contract_id}", headers=headers1)
        assert authorized_response.status_code == status.HTTP_200_OK

    def test_contract_audit_trail(self, client: TestClient, db_session: Session, authenticated_user):
        """Test contract operations create proper audit trail"""
        user, company, headers = authenticated_user
        
        # Create contract
        contract_data = {
            "title": "Audit Trail Test Contract",
            "contract_type": "service_agreement",
            "content": "Initial content for audit testing"
        }
        
        response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
        contract_id = response.json()["id"]
        
        # Update contract
        update_data = {"content": "Updated content for audit testing"}
        client.put(f"/api/v1/contracts/{contract_id}", json=update_data, headers=headers)
        
        # Delete contract
        client.delete(f"/api/v1/contracts/{contract_id}", headers=headers)
        
        # Check audit trail
        audit_response = client.get(f"/api/v1/audit/contracts/{contract_id}", headers=headers)
        assert audit_response.status_code == status.HTTP_200_OK
        
        audit_events = audit_response.json()["items"]
        assert len(audit_events) >= 3  # Create, Update, Delete
        
        # Verify audit event details
        actions = [event["action"] for event in audit_events]
        assert "contract_created" in actions
        assert "contract_updated" in actions
        assert "contract_deleted" in actions

    def test_contract_performance_with_large_dataset(self, client: TestClient, db_session: Session, authenticated_user):
        """Test contract operations performance with larger datasets"""
        user, company, headers = authenticated_user
        
        # Create multiple contracts for performance testing
        contract_ids = []
        batch_size = 20  # Reasonable size for E2E testing
        
        for i in range(batch_size):
            contract_data = {
                "title": f"Performance Test Contract {i+1:03d}",
                "contract_type": "service_agreement",
                "content": f"Content for performance test contract {i+1} with some additional text to make it more realistic",
                "metadata": {"batch": "performance_test", "index": i}
            }
            
            response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
            assert response.status_code == status.HTTP_201_CREATED
            contract_ids.append(response.json()["id"])
        
        # Test pagination performance
        import time
        start_time = time.time()
        
        page_response = client.get("/api/v1/contracts/?page=1&size=10", headers=headers)
        assert page_response.status_code == status.HTTP_200_OK
        
        end_time = time.time()
        response_time = end_time - start_time
        
        # Response should be reasonable (under 2 seconds for this dataset)
        assert response_time < 2.0
        
        # Verify pagination works correctly
        page_data = page_response.json()
        assert len(page_data["items"]) <= 10
        assert page_data["pagination"]["total"] >= batch_size
        
        # Test search performance
        start_time = time.time()
        search_response = client.get("/api/v1/contracts/search?query=performance test", headers=headers)
        search_time = time.time() - start_time
        
        assert search_response.status_code == status.HTTP_200_OK
        assert search_time < 2.0  # Search should be fast