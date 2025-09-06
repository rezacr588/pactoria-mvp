"""
Test for proper Contract entity reconstruction from persistence
Following TDD - test domain entity reconstruction without breaking encapsulation
"""

import pytest
from datetime import datetime, timezone
from decimal import Decimal

from app.domain.entities.contract import Contract, ContractId
from app.domain.value_objects import (
    ContractStatus,
    ContractType,
    Email,
    ContractParty,
    Money,
    DateRange,
    ComplianceScore,
    RiskAssessment,
)


class TestContractReconstruction:
    """Test contract reconstruction from persistence data"""

    def test_contract_can_be_reconstructed_from_persistence_without_breaking_encapsulation(
        self,
    ):
        """Test that contract can be reconstructed properly from persistence data"""
        # Given - persistence data (what would come from database)
        persistence_data = {
            "contract_id": ContractId("contract-123"),
            "title": "Test Contract",
            "contract_type": ContractType.SERVICE_AGREEMENT,
            "status": ContractStatus.ACTIVE,
            "plain_english_input": "Test plain english input",
            "client": ContractParty("Test Client", Email("client@example.com")),
            "supplier": ContractParty("Test Supplier", Email("supplier@example.com")),
            "created_by_user_id": "user-123",
            "company_id": "company-456",
            "contract_value": Money(Decimal("1000.00"), "GBP"),
            "date_range": DateRange(datetime(2024, 1, 1), datetime(2024, 12, 31)),
            "generated_content": "Generated contract content",
            "final_content": "Final contract content",
            "version": 2,
            "created_at": datetime(2024, 1, 1, tzinfo=timezone.utc),
            "updated_at": datetime(2024, 1, 2, tzinfo=timezone.utc),
            "activated_at": datetime(2024, 1, 3, tzinfo=timezone.utc),
            "activated_by_user_id": "user-123",
        }

        # When - reconstructing contract from persistence
        contract = Contract.from_persistence(**persistence_data)

        # Then - all properties should be correctly set
        assert contract.id.value == "contract-123"
        assert contract.title == "Test Contract"
        assert contract.contract_type == ContractType.SERVICE_AGREEMENT
        assert contract.status == ContractStatus.ACTIVE
        assert contract.plain_english_input == "Test plain english input"
        assert contract.client.name == "Test Client"
        assert contract.supplier.name == "Test Supplier"
        assert contract.created_by_user_id == "user-123"
        assert contract.company_id == "company-456"
        assert contract.contract_value.amount == Decimal("1000.00")
        assert contract.contract_value.currency == "GBP"
        assert contract.date_range.start_date == datetime(2024, 1, 1)
        assert contract.date_range.end_date == datetime(2024, 12, 31)
        assert contract.generated_content == "Generated contract content"
        assert contract.final_content == "Final contract content"
        assert contract.version == 2
        assert contract.created_at == datetime(2024, 1, 1, tzinfo=timezone.utc)
        assert contract.updated_at == datetime(2024, 1, 2, tzinfo=timezone.utc)
        assert contract.activated_at == datetime(2024, 1, 3, tzinfo=timezone.utc)
        assert contract.activated_by_user_id == "user-123"

        # Domain events should be cleared (not replayed from persistence)
        assert len(contract.get_domain_events()) == 0

    def test_reconstructed_contract_maintains_business_rules(self):
        """Test that reconstructed contract still enforces business rules"""
        # Given - persistence data for an active contract
        persistence_data = {
            "contract_id": ContractId("contract-123"),
            "title": "Test Contract",
            "contract_type": ContractType.SERVICE_AGREEMENT,
            "status": ContractStatus.ACTIVE,
            "plain_english_input": "Test plain english input",
            "client": ContractParty("Test Client", Email("client@example.com")),
            "supplier": None,
            "created_by_user_id": "user-123",
            "company_id": "company-456",
            "final_content": "Final content",
            "version": 1,
            "created_at": datetime.now(timezone.utc),
            "updated_at": None,
        }

        # When - reconstructing contract
        contract = Contract.from_persistence(**persistence_data)

        # Then - business rules should still be enforced
        with pytest.raises(
            Exception
        ):  # Should not be able to activate already active contract
            contract.activate("user-456")

    def test_contract_reconstruction_with_minimal_data(self):
        """Test reconstruction with only required fields"""
        # Given - minimal persistence data
        persistence_data = {
            "contract_id": ContractId("contract-123"),
            "title": "Test Contract",
            "contract_type": ContractType.SERVICE_AGREEMENT,
            "status": ContractStatus.DRAFT,
            "plain_english_input": "Test plain english input",
            "client": ContractParty("Test Client", Email("client@example.com")),
            "supplier": None,
            "created_by_user_id": "user-123",
            "company_id": "company-456",
            "version": 1,
            "created_at": datetime.now(timezone.utc),
            "updated_at": None,
        }

        # When
        contract = Contract.from_persistence(**persistence_data)

        # Then - required fields should be set, optional fields should be None/default
        assert contract.id.value == "contract-123"
        assert contract.status == ContractStatus.DRAFT
        assert contract.contract_value is None
        assert contract.date_range is None
        assert contract.generated_content is None
        assert contract.final_content is None
        assert contract.activated_at is None
        assert contract.activated_by_user_id is None
