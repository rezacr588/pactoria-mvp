"""
Tests for enum consistency across layers
Following DDD - domain enums should be the single source of truth
"""

import pytest

from app.domain.value_objects import ContractStatus, ContractType


class TestEnumConsistency:
    """Test that domain enums are used consistently across all layers"""

    def test_contract_status_values_are_consistent(self):
        """Test that ContractStatus has all expected values"""
        # Given - expected status values from business requirements
        expected_statuses = {
            "draft",
            "pending_review",
            "active",
            "completed",
            "expired",
            "terminated",
            "deleted",
        }

        # When - getting actual values from domain enum
        actual_statuses = {status.value for status in ContractStatus}

        # Then - all expected values should be present
        assert expected_statuses == actual_statuses

    def test_contract_type_values_are_consistent(self):
        """Test that ContractType has all expected values"""
        # Given - expected type values from business requirements
        expected_types = {
            "service_agreement",
            "employment_contract",
            "supplier_agreement",
            "nda",
            "terms_conditions",
            "consultancy",
            "partnership",
            "lease",
        }

        # When - getting actual values from domain enum
        actual_types = {contract_type.value for contract_type in ContractType}

        # Then - all expected values should be present
        assert expected_types == actual_types

    def test_contract_status_enum_has_string_values(self):
        """Test that status enum values are strings"""
        for status in ContractStatus:
            assert isinstance(status.value, str)
            assert len(status.value) > 0

    def test_contract_type_enum_has_string_values(self):
        """Test that type enum values are strings"""
        for contract_type in ContractType:
            assert isinstance(contract_type.value, str)
            assert len(contract_type.value) > 0

    def test_contract_status_transitions_work(self):
        """Test that status transition validation works"""
        # Given
        draft_status = ContractStatus.DRAFT

        # When & Then - transition validation should work
        assert draft_status.can_transition_to(ContractStatus.ACTIVE)
        assert draft_status.can_transition_to(ContractStatus.PENDING_REVIEW)
        assert not draft_status.can_transition_to(ContractStatus.COMPLETED)

    def test_enums_can_be_created_from_strings(self):
        """Test that enums can be instantiated from string values"""
        # This is important for database/API integration
        status = ContractStatus("draft")
        assert status == ContractStatus.DRAFT

        contract_type = ContractType("service_agreement")
        assert contract_type == ContractType.SERVICE_AGREEMENT

    def test_enums_are_comparable(self):
        """Test enum comparison operations"""
        assert ContractStatus.DRAFT == ContractStatus.DRAFT
        assert ContractStatus.DRAFT != ContractStatus.ACTIVE

        assert ContractType.SERVICE_AGREEMENT == ContractType.SERVICE_AGREEMENT
        assert ContractType.SERVICE_AGREEMENT != ContractType.NDA
