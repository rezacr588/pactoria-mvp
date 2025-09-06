"""
Complete coverage tests for app/core/template_seeder.py
Tests all missing lines and edge cases for 100% coverage
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.core.template_seeder import seed_templates, async_seed_templates, TEMPLATE_DATA
from app.infrastructure.database.models import Template, ContractType


class TestTemplateSeederCompleteCoverage:
    """Complete coverage tests for template seeder"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock(spec=Session)

    @pytest.fixture
    def sample_template_data(self):
        """Sample template data for testing"""
        return {
            "name": "Test Template",
            "contract_type": ContractType.SERVICE_AGREEMENT,
            "description": "Test description",
            "template_content": "Test content",
            "is_default": True,
            "tags": ["test", "template"],
            "created_by_system": True,
        }


class TestGetUkLegalTemplates:
    """Test get_uk_legal_templates function"""

    def test_get_uk_legal_templates_returns_list(self):
        """Test that get_uk_legal_templates returns a list"""
        templates = get_uk_legal_templates()

        assert isinstance(templates, list)
        assert len(templates) > 0

    def test_get_uk_legal_templates_structure(self):
        """Test UK legal templates have correct structure"""
        templates = get_uk_legal_templates()

        for template in templates:
            # Check required fields
            assert "name" in template
            assert "contract_type" in template
            assert "description" in template
            assert "template_content" in template
            assert "is_default" in template
            assert "tags" in template
            assert "created_by_system" in template

    def test_get_uk_legal_templates_contract_types(self):
        """Test UK legal templates have valid contract types"""
        templates = get_uk_legal_templates()

        valid_types = [item.value for item in ContractType]

        for template in templates:
            assert template["contract_type"] in valid_types

    def test_get_uk_legal_templates_content_not_empty(self):
        """Test UK legal templates have non-empty content"""
        templates = get_uk_legal_templates()

        for template in templates:
            assert len(template["name"]) > 0
            assert len(template["description"]) > 0
            assert len(template["template_content"]) > 0

    def test_get_uk_legal_templates_includes_gdpr_content(self):
        """Test UK legal templates include GDPR-related content"""
        templates = get_uk_legal_templates()

        # At least one template should contain GDPR references
        has_gdpr_content = any(
            "gdpr" in template["template_content"].lower()
            or "data protection" in template["template_content"].lower()
            or "gdpr" in " ".join(template.get("tags", [])).lower()
            for template in templates
        )

        assert has_gdpr_content

    def test_get_uk_legal_templates_includes_employment_law(self):
        """Test UK legal templates include employment law content"""
        templates = get_uk_legal_templates()

        # Check for employment-related templates
        has_employment_content = any(
            template["contract_type"] == ContractType.EMPLOYMENT.value
            for template in templates
        )

        assert has_employment_content


class TestSeedTemplatesFunction:
    """Test seed_templates function with complete coverage"""

    def test_seed_templates_success(self, mock_db, sample_template_data):
        """Test successful template seeding"""
        # Mock that no templates exist
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.commit.return_value = None

        with patch("app.core.template_seeder.TEMPLATE_DATA", [sample_template_data]):

            # Should not raise any exceptions
            seed_templates(mock_db)

            # Verify database operations
            assert mock_db.add.called
            assert mock_db.commit.called

    def test_seed_templates_template_already_exists(
        self, mock_db, sample_template_data
    ):
        """Test seeding when template already exists"""
        # Mock that template already exists
        existing_template = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = (
            existing_template
        )

        with patch("app.core.template_seeder.TEMPLATE_DATA", [sample_template_data]):

            seed_templates(mock_db)

            # Should not add duplicate
            assert not mock_db.add.called
            assert mock_db.commit.called  # Still commit (even if nothing to add)

    def test_seed_templates_integrity_error(self, mock_db, sample_template_data):
        """Test handling of integrity error during seeding"""
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.commit.side_effect = IntegrityError("Duplicate key", None, None)

        with patch("app.core.template_seeder.TEMPLATE_DATA", [sample_template_data]):

            # Should handle IntegrityError gracefully
            seed_templates(mock_db)

            # Should rollback on error
            assert mock_db.rollback.called

    def test_seed_templates_database_error(self, mock_db, sample_template_data):
        """Test handling of general database error during seeding"""
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.add.side_effect = SQLAlchemyError("Database connection error")

        with patch("app.core.template_seeder.TEMPLATE_DATA", [sample_template_data]):

            # Should handle database errors gracefully
            seed_templates(mock_db)

            # Should rollback on error
            assert mock_db.rollback.called

    def test_seed_templates_general_exception(self, mock_db, sample_template_data):
        """Test handling of general exception during seeding"""
        mock_db.query.side_effect = Exception("Unexpected error")

        with patch("app.core.template_seeder.TEMPLATE_DATA", [sample_template_data]):

            # Should handle general exceptions gracefully
            seed_templates(mock_db)

            # Should rollback on error
            assert mock_db.rollback.called

    def test_seed_templates_empty_template_list(self, mock_db):
        """Test seeding with empty template list"""
        with patch("app.core.template_seeder.TEMPLATE_DATA", []):

            # Should handle empty list gracefully
            seed_templates(mock_db)

            # Should still commit (even with no templates)
            assert mock_db.commit.called

    def test_seed_templates_multiple_templates(self, mock_db):
        """Test seeding multiple templates"""
        templates = [
            {
                "name": "Template 1",
                "contract_type": ContractType.SERVICE_AGREEMENT,
                "description": "Description 1",
                "template_content": "Content 1",
                "is_default": True,
                "category": "Category 1",
            },
            {
                "name": "Template 2",
                "contract_type": ContractType.EMPLOYMENT_CONTRACT,
                "description": "Description 2",
                "template_content": "Content 2",
                "is_default": False,
                "category": "Category 2",
            },
        ]

        # Mock that no templates exist
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with patch("app.core.template_seeder.TEMPLATE_DATA", templates):

            seed_templates(mock_db)

            # Should add all templates
            assert mock_db.add.call_count == 2
            assert mock_db.commit.called

    def test_seed_templates_partial_existing(self, mock_db):
        """Test seeding when some templates already exist"""
        templates = [
            {
                "name": "Existing Template",
                "contract_type": ContractType.SERVICE_AGREEMENT,
                "description": "Description 1",
                "template_content": "Content 1",
                "is_default": True,
                "category": "Category 1",
            },
            {
                "name": "New Template",
                "contract_type": ContractType.EMPLOYMENT_CONTRACT,
                "description": "Description 2",
                "template_content": "Content 2",
                "is_default": False,
                "category": "Category 2",
            },
        ]

        def mock_query_filter_first(template_name):
            # Return existing template for first one, None for second
            if "Existing" in template_name:
                return Mock()
            return None

        # Mock query behavior
        mock_query = Mock()
        mock_filter = Mock()
        mock_query.filter.return_value = mock_filter
        mock_db.query.return_value = mock_query

        # Configure side effect for first() calls
        mock_filter.first.side_effect = [Mock(), None]  # First exists, second doesn't

        with patch("app.core.template_seeder.TEMPLATE_DATA", templates):

            seed_templates(mock_db)

            # Should only add the new template (call count = 1)
            assert mock_db.add.call_count == 1
            assert mock_db.commit.called


class TestTemplateDataValidation:
    """Test template data validation and content"""

    def test_all_templates_have_required_fields(self):
        """Test all templates have required fields"""
        templates = get_uk_legal_templates()
        required_fields = [
            "name",
            "contract_type",
            "description",
            "template_content",
            "is_default",
            "tags",
            "created_by_system",
        ]

        for template in templates:
            for field in required_fields:
                assert field in template, f"Template missing required field: {field}"

    def test_template_content_contains_uk_specific_terms(self):
        """Test template content contains UK-specific legal terms"""
        templates = get_uk_legal_templates()

        uk_terms = [
            "united kingdom",
            "uk",
            "british",
            "england",
            "wales",
            "scotland",
            "gdpr",
            "data protection act",
            "employment rights act",
            "companies house",
            "hmrc",
            "vat",
        ]

        # At least some templates should contain UK-specific terms
        has_uk_terms = False
        for template in templates:
            content_lower = template["template_content"].lower()
            if any(term in content_lower for term in uk_terms):
                has_uk_terms = True
                break

        assert has_uk_terms

    def test_template_tags_are_valid(self):
        """Test template tags are valid and meaningful"""
        templates = get_uk_legal_templates()

        for template in templates:
            tags = template.get("tags", [])
            assert isinstance(tags, list)

            for tag in tags:
                assert isinstance(tag, str)
                assert len(tag) > 0
                # Tags should be lowercase and contain no spaces
                assert tag.islower()

    def test_template_names_are_unique(self):
        """Test template names are unique"""
        templates = get_uk_legal_templates()
        names = [template["name"] for template in templates]

        assert len(names) == len(set(names)), "Template names should be unique"

    def test_template_contract_types_are_distributed(self):
        """Test templates cover multiple contract types"""
        templates = get_uk_legal_templates()
        contract_types = set(template["contract_type"] for template in templates)

        # Should have templates for multiple contract types
        assert len(contract_types) >= 3


class TestAsyncFunctionBehavior:
    """Test async function behavior and error handling"""

    def test_async_seed_templates(self, mock_db):
        """Test async_seed_templates function"""
        import asyncio

        with patch("app.core.template_seeder.TEMPLATE_DATA", []):
            with patch("app.core.template_seeder.SessionLocal"):
                # Should be awaitable
                task = async_seed_templates()
                assert asyncio.iscoroutine(task)

                # Close the coroutine to avoid ResourceWarning
                task.close()

    def test_seed_templates_concurrent_calls(self, mock_db):
        """Test concurrent calls to seed_templates"""
        with patch("app.core.template_seeder.TEMPLATE_DATA", []):

            # Multiple calls should all complete without error
            for _ in range(3):
                seed_templates(mock_db)

            # Should have called commit multiple times
            assert mock_db.commit.call_count >= 3


class TestErrorScenarios:
    """Test various error scenarios"""

    def test_seed_templates_rollback_called_on_commit_error(self, mock_db):
        """Test rollback is called when commit fails"""
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.commit.side_effect = Exception("Commit failed")

        sample_template = {
            "name": "Test Template",
            "contract_type": ContractType.SERVICE_AGREEMENT,
            "description": "Test",
            "template_content": "Test content",
            "is_default": True,
            "tags": ["test"],
            "created_by_system": True,
        }

        with patch(
            "app.core.template_seeder.get_uk_legal_templates"
        ) as mock_get_templates:
            mock_get_templates.return_value = [sample_template]

            seed_templates(mock_db)

            # Rollback should be called
            assert mock_db.rollback.called

    def test_seed_templates_handles_template_creation_error(self, mock_db):
        """Test handling of template creation error"""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        sample_template = {
            "name": "Test Template",
            "contract_type": "invalid_type",  # Invalid contract type
            "description": "Test",
            "template_content": "Test content",
            "is_default": True,
            "tags": ["test"],
            "created_by_system": True,
        }

        with patch(
            "app.core.template_seeder.get_uk_legal_templates"
        ) as mock_get_templates:
            mock_get_templates.return_value = [sample_template]

            # Mock Template creation to fail
            with patch(
                "app.core.template_seeder.Template",
                side_effect=ValueError("Invalid contract type"),
            ):
                seed_templates(mock_db)

                # Should handle gracefully
                assert mock_db.rollback.called


class TestIntegrationScenarios:
    """Test integration scenarios"""

    def test_seed_templates_real_template_data_structure(self, mock_db):
        """Test seeding with real template data structure"""
        # Use actual template data
        real_templates = get_uk_legal_templates()

        # Mock that no templates exist
        mock_db.query.return_value.filter.return_value.first.return_value = None

        # Should handle real template data without error
        seed_templates(mock_db)

        # Should attempt to add all real templates
        assert mock_db.add.call_count == len(real_templates)
        assert mock_db.commit.called
