"""
Unit tests for Contract Service
Testing MVP requirements for contract management and version control
"""
import pytest
from unittest.mock import Mock, patch
from datetime import datetime
from uuid import uuid4

from app.services.contract_service import ContractService


class TestContractService:
    """Test cases for contract service functionality"""
    
    @pytest.fixture
    def contract_service(self):
        """Create contract service instance for testing"""
        return ContractService()
    
    @pytest.fixture
    def sample_contract_data(self):
        """Sample contract data for testing"""
        return {
            "title": "Test Service Agreement",
            "contract_type": "service_agreement",
            "plain_english_input": "Need consulting contract with payment terms",
            "generated_content": "GENERATED CONTRACT CONTENT",
            "user_id": "user-123",
            "company_id": "company-456",
            "ai_metadata": {
                "model_used": "llama3-70b-8192",
                "processing_time_ms": 1500,
                "confidence_score": 0.85
            },
            "compliance_data": {
                "overall_score": 0.92,
                "gdpr_compliance": 0.95,
                "risk_score": 3
            }
        }
    
    @pytest.mark.asyncio
    async def test_create_contract_success(self, contract_service, sample_contract_data):
        """Test successful contract creation"""
        # Mock UUID generation
        mock_id = "contract-uuid-123"
        with patch('app.services.contract_service.uuid4', return_value=mock_id):
            contract = await contract_service.create_contract(
                title=sample_contract_data["title"],
                contract_type=sample_contract_data["contract_type"],
                plain_english_input=sample_contract_data["plain_english_input"],
                generated_content=sample_contract_data["generated_content"],
                user_id=sample_contract_data["user_id"],
                company_id=sample_contract_data["company_id"],
                ai_metadata=sample_contract_data["ai_metadata"],
                compliance_data=sample_contract_data["compliance_data"]
            )
        
        # Assertions
        assert contract["id"] == mock_id
        assert contract["title"] == sample_contract_data["title"]
        assert contract["contract_type"] == sample_contract_data["contract_type"]
        assert contract["status"] == "draft"
        assert contract["version"] == 1
        assert contract["plain_english_input"] == sample_contract_data["plain_english_input"]
        assert contract["generated_content"] == sample_contract_data["generated_content"]
        assert contract["final_content"] is None
        assert contract["created_by_id"] == sample_contract_data["user_id"]
        assert contract["company_id"] == sample_contract_data["company_id"]
        assert isinstance(contract["created_at"], datetime)
        assert isinstance(contract["updated_at"], datetime)
        assert contract["ai_generation"] == sample_contract_data["ai_metadata"]
        assert contract["compliance_score"] == sample_contract_data["compliance_data"]
        
        # Verify contract is stored
        assert mock_id in contract_service.contracts
        
        # Verify initial version is created
        versions = await contract_service.get_contract_versions(mock_id)
        assert len(versions) == 1
        assert versions[0]["version_number"] == 1
        assert versions[0]["content"] == sample_contract_data["generated_content"]
    
    @pytest.mark.asyncio
    async def test_get_contract_success(self, contract_service, sample_contract_data):
        """Test retrieving existing contract"""
        # Create a contract first
        contract = await contract_service.create_contract(**sample_contract_data)
        contract_id = contract["id"]
        
        # Retrieve the contract
        retrieved_contract = await contract_service.get_contract(contract_id)
        
        # Assertions
        assert retrieved_contract is not None
        assert retrieved_contract["id"] == contract_id
        assert retrieved_contract["title"] == sample_contract_data["title"]
    
    @pytest.mark.asyncio
    async def test_get_contract_not_found(self, contract_service):
        """Test retrieving non-existent contract"""
        result = await contract_service.get_contract("non-existent-id")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_update_contract_content(self, contract_service, sample_contract_data):
        """Test updating contract content with version control"""
        # Create contract
        contract = await contract_service.create_contract(**sample_contract_data)
        contract_id = contract["id"]
        
        # Update contract content
        new_content = "UPDATED CONTRACT CONTENT"
        updates = {
            "content": new_content,
            "title": "Updated Title"
        }
        
        updated_contract = await contract_service.update_contract(
            contract_id, updates, "user-456"
        )
        
        # Assertions
        assert updated_contract is not None
        assert updated_contract["title"] == "Updated Title"
        assert updated_contract["final_content"] == new_content
        assert updated_contract["version"] == 2  # Version incremented
        
        # Verify new version was created
        versions = await contract_service.get_contract_versions(contract_id)
        assert len(versions) == 2
        assert versions[1]["version_number"] == 2
        assert versions[1]["content"] == new_content
    
    @pytest.mark.asyncio
    async def test_update_contract_without_content_change(self, contract_service, sample_contract_data):
        """Test updating contract without changing content (no version increment)"""
        # Create contract
        contract = await contract_service.create_contract(**sample_contract_data)
        contract_id = contract["id"]
        
        # Update without content change
        updates = {"title": "New Title Only"}
        
        updated_contract = await contract_service.update_contract(
            contract_id, updates, "user-456"
        )
        
        # Assertions
        assert updated_contract["title"] == "New Title Only"
        assert updated_contract["version"] == 1  # Version not incremented
        
        # Verify no new version created
        versions = await contract_service.get_contract_versions(contract_id)
        assert len(versions) == 1
    
    @pytest.mark.asyncio
    async def test_update_contract_not_found(self, contract_service):
        """Test updating non-existent contract"""
        result = await contract_service.update_contract(
            "non-existent-id", {"title": "New Title"}, "user-123"
        )
        assert result is None
    
    @pytest.mark.asyncio
    async def test_list_contracts_filtering(self, contract_service):
        """Test contract listing with filtering"""
        # Create multiple contracts for the same company
        company_id = "company-123"
        
        # Create contracts of different types and statuses
        contracts_data = [
            {
                "title": "Service Agreement 1",
                "contract_type": "service_agreement",
                "status": "draft"
            },
            {
                "title": "Service Agreement 2", 
                "contract_type": "service_agreement",
                "status": "active"
            },
            {
                "title": "Employment Contract 1",
                "contract_type": "employment_contract",
                "status": "draft"
            }
        ]
        
        created_contracts = []
        for data in contracts_data:
            contract_data = {
                "title": data["title"],
                "contract_type": data["contract_type"],
                "plain_english_input": "test input",
                "generated_content": "test content",
                "user_id": "user-123",
                "company_id": company_id,
                "ai_metadata": {},
                "compliance_data": {}
            }
            contract = await contract_service.create_contract(**contract_data)
            # Update status if needed
            if data.get("status") != "draft":
                await contract_service.update_contract(
                    contract["id"], {"status": data["status"]}, "user-123"
                )
            created_contracts.append(contract)
        
        # Test listing all contracts
        result = await contract_service.list_contracts(company_id)
        assert result["total"] == 3
        assert len(result["contracts"]) == 3
        
        # Test filtering by contract type
        result = await contract_service.list_contracts(
            company_id, contract_type="service_agreement"
        )
        assert result["total"] == 2
        
        # Test filtering by status
        result = await contract_service.list_contracts(
            company_id, status="draft"
        )
        assert result["total"] == 2
        
        # Test pagination
        result = await contract_service.list_contracts(
            company_id, page=1, per_page=2
        )
        assert len(result["contracts"]) == 2
        assert result["pages"] == 2
    
    @pytest.mark.asyncio
    async def test_delete_contract(self, contract_service, sample_contract_data):
        """Test soft deletion of contract"""
        # Create contract
        contract = await contract_service.create_contract(**sample_contract_data)
        contract_id = contract["id"]
        
        # Delete contract
        result = await contract_service.delete_contract(contract_id, "user-456")
        assert result is True
        
        # Verify contract is marked as deleted
        deleted_contract = await contract_service.get_contract(contract_id)
        assert deleted_contract["status"] == "deleted"
        assert "deleted_at" in deleted_contract
        assert deleted_contract["deleted_by"] == "user-456"
    
    @pytest.mark.asyncio
    async def test_delete_contract_not_found(self, contract_service):
        """Test deleting non-existent contract"""
        result = await contract_service.delete_contract("non-existent-id", "user-123")
        assert result is False
    
    @pytest.mark.asyncio
    async def test_get_contract_versions(self, contract_service, sample_contract_data):
        """Test retrieving contract version history"""
        # Create contract
        contract = await contract_service.create_contract(**sample_contract_data)
        contract_id = contract["id"]
        
        # Make several updates
        updates = [
            {"content": "Version 2 content"},
            {"content": "Version 3 content"},
            {"content": "Version 4 content"}
        ]
        
        for update in updates:
            await contract_service.update_contract(contract_id, update, "user-123")
        
        # Get version history
        versions = await contract_service.get_contract_versions(contract_id)
        
        # Assertions
        assert len(versions) == 4  # Initial + 3 updates
        
        # Verify versions are in order
        for i, version in enumerate(versions):
            assert version["version_number"] == i + 1
            assert version["contract_id"] == contract_id
            assert "created_at" in version
            assert "created_by_id" in version
    
    @pytest.mark.asyncio
    async def test_export_contract_pdf(self, contract_service, sample_contract_data):
        """Test PDF export functionality"""
        # Create contract
        contract = await contract_service.create_contract(**sample_contract_data)
        contract_id = contract["id"]
        
        # Export PDF
        pdf_data = await contract_service.export_contract_pdf(contract_id)
        
        # Assertions
        assert pdf_data is not None
        assert "filename" in pdf_data
        assert pdf_data["filename"] == f"contract_{contract_id}.pdf"
        assert "download_url" in pdf_data
        assert "size_bytes" in pdf_data
        assert "generated_at" in pdf_data
    
    @pytest.mark.asyncio
    async def test_export_contract_pdf_not_found(self, contract_service):
        """Test PDF export for non-existent contract"""
        result = await contract_service.export_contract_pdf("non-existent-id")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_contract_statistics(self, contract_service):
        """Test contract statistics generation"""
        company_id = "company-stats-test"
        
        # Create contracts with different types and statuses
        contracts_to_create = [
            {"type": "service_agreement", "status": "draft"},
            {"type": "service_agreement", "status": "active"},
            {"type": "employment_contract", "status": "active"},
            {"type": "nda", "status": "draft"}
        ]
        
        for contract_info in contracts_to_create:
            contract_data = {
                "title": f"Test {contract_info['type']}",
                "contract_type": contract_info["type"],
                "plain_english_input": "test",
                "generated_content": "test",
                "user_id": "user-123",
                "company_id": company_id,
                "ai_metadata": {},
                "compliance_data": {"overall_score": 0.9}
            }
            contract = await contract_service.create_contract(**contract_data)
            
            # Update status if needed
            if contract_info["status"] != "draft":
                await contract_service.update_contract(
                    contract["id"], {"status": contract_info["status"]}, "user-123"
                )
        
        # Get statistics
        stats = await contract_service.get_contract_statistics(company_id)
        
        # Assertions
        assert stats["total_contracts"] == 4
        assert stats["draft_contracts"] == 2
        assert stats["active_contracts"] == 2
        assert stats["contracts_this_month"] == 4  # All created this month
        assert stats["average_compliance_score"] == 0.9
        assert "contract_types" in stats
        assert stats["contract_types"]["service_agreement"] == 2
        assert stats["contract_types"]["employment_contract"] == 1
        assert stats["contract_types"]["nda"] == 1
    
    def test_calculate_avg_compliance(self, contract_service):
        """Test average compliance score calculation"""
        contracts = [
            {"compliance_score": {"overall_score": 0.9}},
            {"compliance_score": {"overall_score": 0.8}},
            {"compliance_score": {"overall_score": 0.95}},
            {"compliance_score": None},  # Should be ignored
        ]
        
        avg_score = contract_service._calculate_avg_compliance(contracts)
        expected = (0.9 + 0.8 + 0.95) / 3
        assert abs(avg_score - expected) < 0.001
        
        # Test with no compliance scores
        empty_contracts = [{"compliance_score": None}]
        avg_empty = contract_service._calculate_avg_compliance(empty_contracts)
        assert avg_empty == 0.0
    
    def test_get_contract_type_breakdown(self, contract_service):
        """Test contract type breakdown calculation"""
        contracts = [
            {"contract_type": "service_agreement"},
            {"contract_type": "service_agreement"},
            {"contract_type": "employment_contract"},
            {"contract_type": "nda"},
            {"contract_type": "nda"},
            {"contract_type": "nda"}
        ]
        
        breakdown = contract_service._get_contract_type_breakdown(contracts)
        
        assert breakdown["service_agreement"] == 2
        assert breakdown["employment_contract"] == 1
        assert breakdown["nda"] == 3
    
    @pytest.mark.asyncio
    async def test_version_control_audit_trail(self, contract_service, sample_contract_data):
        """Test that version control maintains proper audit trail"""
        # Create contract
        contract = await contract_service.create_contract(**sample_contract_data)
        contract_id = contract["id"]
        
        # Make updates by different users
        users = ["user-1", "user-2", "user-3"]
        changes = ["First edit", "Second edit", "Final edit"]
        
        for user, change in zip(users, changes):
            await contract_service.update_contract(
                contract_id, 
                {"content": f"Content: {change}"}, 
                user
            )
        
        # Verify audit trail
        versions = await contract_service.get_contract_versions(contract_id)
        assert len(versions) == 4  # Initial + 3 updates
        
        # Check that different users are recorded
        created_by_users = [v["created_by_id"] for v in versions[1:]]  # Skip initial
        assert "user-1" in created_by_users
        assert "user-2" in created_by_users
        assert "user-3" in created_by_users
    
    @pytest.mark.asyncio
    async def test_contract_lifecycle_status_transitions(self, contract_service, sample_contract_data):
        """Test contract status transitions through lifecycle"""
        # Create contract (starts as draft)
        contract = await contract_service.create_contract(**sample_contract_data)
        contract_id = contract["id"]
        assert contract["status"] == "draft"
        
        # Transition to pending_review
        await contract_service.update_contract(
            contract_id, {"status": "pending_review"}, "user-123"
        )
        updated = await contract_service.get_contract(contract_id)
        assert updated["status"] == "pending_review"
        
        # Transition to active
        await contract_service.update_contract(
            contract_id, {"status": "active"}, "user-123"
        )
        updated = await contract_service.get_contract(contract_id)
        assert updated["status"] == "active"
        
        # Test soft deletion
        await contract_service.delete_contract(contract_id, "user-456")
        deleted = await contract_service.get_contract(contract_id)
        assert deleted["status"] == "deleted"