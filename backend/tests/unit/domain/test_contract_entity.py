"""
Unit tests for Contract Domain Entity
Following TDD principles - tests written first to define expected behavior
"""

import pytest
from datetime import datetime, timezone
from decimal import Decimal

from app.domain.entities.contract import Contract, ContractId
from app.domain.value_objects import (
    ContractStatus,
    ContractType,
    Money,
    DateRange,
    Email,
    ContractParty,
    ComplianceScore,
    RiskAssessment,
)
from app.domain.exceptions import DomainValidationError, BusinessRuleViolationError


class TestContractEntity:
    """Test Contract domain entity"""

    def test_create_contract_with_valid_data(self):
        """Test creating a contract with valid data"""
        # Given
        contract_id = ContractId("contract-123")
        title = "Service Agreement"
        contract_type = ContractType.SERVICE_AGREEMENT
        client = ContractParty(
            "Client Corp", Email("client@example.com"), "Client Corp Ltd"
        )
        supplier = ContractParty(
            "Supplier Inc", Email("supplier@example.com"), "Supplier Inc Ltd"
        )

        # When
        contract = Contract.create(
            contract_id=contract_id,
            title=title,
            contract_type=contract_type,
            plain_english_input="We need a service agreement for consulting",
            client=client,
            supplier=supplier,
            created_by_user_id="user-123",
            company_id="company-456",
        )

        # Then
        assert contract.id == contract_id
        assert contract.title == title
        assert contract.contract_type == contract_type
        assert contract.status == ContractStatus.DRAFT
        assert contract.client == client
        assert contract.supplier == supplier
        assert contract.version == 1
        assert contract.created_by_user_id == "user-123"
        assert contract.company_id == "company-456"
        assert contract.created_at is not None

    def test_create_contract_with_invalid_title_raises_error(self):
        """Test that empty title raises validation error"""
        # Given
        contract_id = ContractId("contract-123")
        empty_title = ""

        # When & Then
        with pytest.raises(
            DomainValidationError, match="Contract title cannot be empty"
        ):
            Contract.create(
                contract_id=contract_id,
                title=empty_title,
                contract_type=ContractType.SERVICE_AGREEMENT,
                plain_english_input="Valid input",
                client=ContractParty("Client", Email("client@example.com")),
                supplier=None,
                created_by_user_id="user-123",
                company_id="company-456",
            )

    def test_add_contract_value_with_valid_money(self):
        """Test adding contract value"""
        # Given
        contract = self._create_valid_contract()
        money = Money(Decimal("25000.00"), "GBP")

        # When
        contract.set_contract_value(money)

        # Then
        assert contract.contract_value == money

    def test_set_date_range_with_valid_dates(self):
        """Test setting valid date range"""
        # Given
        contract = self._create_valid_contract()
        start_date = datetime(2024, 1, 1, tzinfo=timezone.utc)
        end_date = datetime(2024, 12, 31, tzinfo=timezone.utc)
        date_range = DateRange(start_date, end_date)

        # When
        contract.set_date_range(date_range)

        # Then
        assert contract.date_range == date_range

    def test_set_date_range_with_end_before_start_raises_error(self):
        """Test that invalid date range raises error"""
        # Given
        contract = self._create_valid_contract()
        start_date = datetime(2024, 12, 31, tzinfo=timezone.utc)
        end_date = datetime(2024, 1, 1, tzinfo=timezone.utc)

        # When & Then
        with pytest.raises(ValueError, match="Start date must be before end date"):
            DateRange(start_date, end_date)

    def test_generate_ai_content_updates_content(self):
        """Test generating AI content"""
        # Given
        contract = self._create_valid_contract()
        ai_content = "This is AI-generated contract content..."
        ai_metadata = {
            "model_name": "groq-llama",
            "processing_time_ms": 1500.0,
            "confidence_score": 0.95,
        }

        # When
        contract.set_generated_content(ai_content, ai_metadata)

        # Then
        assert contract.generated_content == ai_content
        assert contract.ai_metadata == ai_metadata

    def test_finalize_content_updates_final_content(self):
        """Test finalizing contract content"""
        # Given
        contract = self._create_valid_contract()
        contract.set_generated_content("Generated content", {})
        final_content = "Final edited contract content"

        # When
        contract.finalize_content(final_content, "user-123")

        # Then
        assert contract.final_content == final_content
        assert contract.updated_at is not None

    def test_analyze_compliance_sets_compliance_score(self):
        """Test analyzing compliance"""
        # Given
        contract = self._create_valid_contract()
        compliance_score = ComplianceScore(
            overall_score=0.96, gdpr_compliance=0.98, employment_law_compliance=0.94
        )
        risk_assessment = RiskAssessment(
            risk_score=2,
            risk_factors=["Low risk factors"],
            recommendations=["Continue as planned"],
        )

        # When
        contract.set_compliance_analysis(compliance_score, risk_assessment)

        # Then
        assert contract.compliance_score == compliance_score
        assert contract.risk_assessment == risk_assessment

    def test_activate_contract_changes_status(self):
        """Test activating contract"""
        # Given
        contract = self._create_valid_contract()
        contract.set_generated_content("Content", {})
        contract.finalize_content("Final content", "user-123")

        # When
        contract.activate("user-123")

        # Then
        assert contract.status == ContractStatus.ACTIVE
        assert contract.activated_at is not None
        assert contract.activated_by_user_id == "user-123"

    def test_activate_contract_without_final_content_raises_error(self):
        """Test that activating contract without content raises error"""
        # Given
        contract = self._create_valid_contract()

        # When & Then
        with pytest.raises(
            BusinessRuleViolationError,
            match="Cannot activate contract without final content",
        ):
            contract.activate("user-123")

    def test_complete_contract_from_active_status(self):
        """Test completing an active contract"""
        # Given
        contract = self._create_valid_contract()
        contract.set_generated_content("Content", {})
        contract.finalize_content("Final content", "user-123")
        contract.activate("user-123")

        # When
        contract.complete("user-123")

        # Then
        assert contract.status == ContractStatus.COMPLETED
        assert contract.completed_at is not None
        assert contract.completed_by_user_id == "user-123"

    def test_complete_contract_from_draft_status_raises_error(self):
        """Test that completing draft contract raises error"""
        # Given
        contract = self._create_valid_contract()

        # When & Then
        with pytest.raises(
            BusinessRuleViolationError,
            match="Cannot complete contract that is not active",
        ):
            contract.complete("user-123")

    def test_terminate_contract_with_reason(self):
        """Test terminating contract"""
        # Given
        contract = self._create_valid_contract()
        contract.set_generated_content("Content", {})
        contract.finalize_content("Final content", "user-123")
        contract.activate("user-123")
        termination_reason = "Mutual agreement"

        # When
        contract.terminate("user-123", termination_reason)

        # Then
        assert contract.status == ContractStatus.TERMINATED
        assert contract.terminated_at is not None
        assert contract.terminated_by_user_id == "user-123"
        assert contract.termination_reason == termination_reason

    def test_create_new_version_increments_version(self):
        """Test creating a new version"""
        # Given
        contract = self._create_valid_contract()
        contract.set_generated_content("Content", {})
        new_content = "Updated contract content"
        change_summary = "Updated terms and conditions"
        initial_version = contract.version

        # When
        contract.create_new_version(new_content, change_summary, "user-123")

        # Then
        assert contract.version == initial_version + 1
        assert contract.final_content == new_content
        assert len(contract.versions) == 1
        assert contract.versions[0].change_summary == change_summary

    def test_contract_equality_by_id(self):
        """Test contract equality based on ID"""
        # Given
        contract_id = ContractId("contract-123")
        contract1 = self._create_contract_with_id(contract_id)
        contract2 = self._create_contract_with_id(contract_id)
        contract3 = self._create_contract_with_id(ContractId("contract-456"))

        # When & Then
        assert contract1 == contract2
        assert contract1 != contract3

    def test_contract_hash_by_id(self):
        """Test contract hashing based on ID"""
        # Given
        contract_id = ContractId("contract-123")
        contract = self._create_contract_with_id(contract_id)

        # When & Then
        assert hash(contract) == hash(contract_id)

    def _create_valid_contract(self) -> Contract:
        """Helper to create a valid contract for testing"""
        return Contract.create(
            contract_id=ContractId("contract-123"),
            title="Test Contract",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Test plain english input",
            client=ContractParty("Test Client", Email("client@example.com")),
            supplier=None,
            created_by_user_id="user-123",
            company_id="company-456",
        )

    def _create_contract_with_id(self, contract_id: ContractId) -> Contract:
        """Helper to create contract with specific ID"""
        return Contract.create(
            contract_id=contract_id,
            title="Test Contract",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Test input",
            client=ContractParty("Client", Email("client@example.com")),
            supplier=None,
            created_by_user_id="user-123",
            company_id="company-456",
        )


class TestContractBusinessRules:
    """Test Contract business rules"""

    def test_cannot_activate_expired_contract(self):
        """Test that expired contracts cannot be activated"""
        # Given
        contract = self._create_valid_contract()
        past_end_date = datetime(2020, 1, 1, tzinfo=timezone.utc)
        date_range = DateRange(datetime(2019, 1, 1, tzinfo=timezone.utc), past_end_date)
        contract.set_date_range(date_range)
        contract.set_generated_content("Content", {})
        contract.finalize_content("Final content", "user-123")

        # When & Then
        with pytest.raises(
            BusinessRuleViolationError, match="Cannot activate expired contract"
        ):
            contract.activate("user-123")

    def test_cannot_modify_completed_contract(self):
        """Test that completed contracts cannot be modified"""
        # Given
        contract = self._create_valid_contract()
        contract.set_generated_content("Content", {})
        contract.finalize_content("Final content", "user-123")
        contract.activate("user-123")
        contract.complete("user-123")

        # When & Then
        with pytest.raises(
            BusinessRuleViolationError, match="Cannot modify completed contract"
        ):
            contract.finalize_content("New content", "user-123")

    def test_cannot_set_negative_contract_value(self):
        """Test that negative contract values are rejected"""
        # When & Then
        with pytest.raises(ValueError, match="Money amount cannot be negative"):
            Money(Decimal("-1000.00"), "GBP")

    def test_compliance_score_must_be_between_zero_and_one(self):
        """Test compliance score validation"""
        # When & Then
        with pytest.raises(
            ValueError, match="Compliance score must be between 0 and 1"
        ):
            ComplianceScore(overall_score=1.5)

    def test_risk_score_must_be_between_one_and_ten(self):
        """Test risk score validation"""
        # When & Then
        with pytest.raises(ValueError, match="Risk score must be between 1 and 10"):
            RiskAssessment(risk_score=15)

    def _create_valid_contract(self) -> Contract:
        """Helper to create a valid contract for testing"""
        return Contract.create(
            contract_id=ContractId("contract-123"),
            title="Test Contract",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Test plain english input",
            client=ContractParty("Test Client", Email("client@example.com")),
            supplier=None,
            created_by_user_id="user-123",
            company_id="company-456",
        )
