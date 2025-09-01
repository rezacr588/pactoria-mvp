"""
Unit tests for core template seeder module
Tests template data loading and database seeding functionality
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from app.core.template_seeder import (
    TEMPLATE_DATA, seed_templates, async_seed_templates
)
from app.infrastructure.database.models import Template, ContractType


class TestTemplateData:
    """Test template data structure"""
    
    def test_template_data_exists(self):
        """Test that template data is defined"""
        assert TEMPLATE_DATA is not None
        assert isinstance(TEMPLATE_DATA, list)
        assert len(TEMPLATE_DATA) > 0
    
    def test_template_data_structure(self):
        """Test that template data has required fields"""
        required_fields = [
            "name", "category", "contract_type", "description", 
            "template_content", "compliance_features", "legal_notes", "suitable_for"
        ]
        
        for template in TEMPLATE_DATA:
            for field in required_fields:
                assert field in template, f"Missing field {field} in template {template.get('name', 'unknown')}"
    
    def test_template_data_types(self):
        """Test template data field types"""
        for template in TEMPLATE_DATA:
            assert isinstance(template["name"], str)
            assert isinstance(template["category"], str)
            assert isinstance(template["contract_type"], ContractType)
            assert isinstance(template["description"], str)
            assert isinstance(template["template_content"], str)
            assert isinstance(template["compliance_features"], list)
            assert isinstance(template["legal_notes"], str)
            assert isinstance(template["suitable_for"], list)
    
    def test_template_content_has_placeholders(self):
        """Test that template content includes placeholder variables"""
        for template in TEMPLATE_DATA:
            content = template["template_content"]
            # Should have at least some placeholder variables
            assert "{{" in content and "}}" in content, f"Template {template['name']} missing placeholders"
    
    def test_employment_contract_template(self):
        """Test employment contract template specifically"""
        employment_templates = [
            t for t in TEMPLATE_DATA 
            if t["contract_type"] == ContractType.EMPLOYMENT_CONTRACT
        ]
        
        assert len(employment_templates) > 0, "No employment contract templates found"
        
        employment_template = employment_templates[0]
        content = employment_template["template_content"]
        
        # Check for UK employment law compliance elements
        assert "UK GDPR" in content or "GDPR" in content
        assert "notice" in content.lower()
        assert "salary" in content.lower()
        assert "holiday" in content.lower()
    
    def test_service_agreement_template(self):
        """Test service agreement template specifically"""
        service_templates = [
            t for t in TEMPLATE_DATA 
            if t["contract_type"] == ContractType.SERVICE_AGREEMENT
        ]
        
        assert len(service_templates) > 0, "No service agreement templates found"
        
        service_template = service_templates[0]
        content = service_template["template_content"]
        
        # Check for standard service agreement elements
        assert "service" in content.lower()
        assert "fee" in content.lower() or "payment" in content.lower()
        assert "intellectual property" in content.lower() or "ip" in content.lower()
    
    def test_compliance_features_not_empty(self):
        """Test that compliance features are specified"""
        for template in TEMPLATE_DATA:
            compliance = template["compliance_features"]
            assert len(compliance) > 0, f"Template {template['name']} has no compliance features"
            
            # Check for UK-specific compliance
            compliance_text = " ".join(compliance).lower()
            uk_indicators = ["uk", "gdpr", "english", "britain", "employment rights"]
            assert any(indicator in compliance_text for indicator in uk_indicators), \
                f"Template {template['name']} lacks UK compliance indicators"


class TestSeedTemplates:
    """Test template seeding functions"""
    
    def test_seed_templates_with_empty_db(self):
        """Test seed_templates function with empty database"""
        mock_db = Mock(spec=Session)
        
        # Mock count query to return 0 (no existing templates)
        mock_db.query.return_value.count.return_value = 0
        
        seed_templates(mock_db)
        
        # Verify database operations were called
        assert mock_db.add.call_count == len(TEMPLATE_DATA)
        mock_db.commit.assert_called_once()
    
    def test_seed_templates_skip_existing(self):
        """Test that seed_templates skips when templates exist"""
        mock_db = Mock(spec=Session)
        
        # Mock count query to return existing templates
        mock_db.query.return_value.count.return_value = 5
        
        seed_templates(mock_db)
        
        # Should not add any templates since they already exist
        mock_db.add.assert_not_called()
        mock_db.commit.assert_not_called()
    
    def test_seed_templates_handles_exception(self):
        """Test seed_templates handles database exceptions"""
        mock_db = Mock(spec=Session)
        mock_db.query.return_value.count.return_value = 0
        mock_db.commit.side_effect = Exception("Database error")
        
        with pytest.raises(Exception):
            seed_templates(mock_db)
        
        mock_db.rollback.assert_called_once()
    
    @patch('app.core.template_seeder.SessionLocal')
    async def test_async_seed_templates(self, mock_session_local):
        """Test async_seed_templates function"""
        mock_db = Mock(spec=Session)
        mock_session_local.return_value.__enter__ = Mock(return_value=mock_db)
        mock_session_local.return_value.__exit__ = Mock(return_value=False)
        
        mock_db.query.return_value.count.return_value = 0
        
        await async_seed_templates()
        
        # Verify session was created and used
        mock_session_local.assert_called_once()
        assert mock_db.add.call_count == len(TEMPLATE_DATA)
    
    @patch('app.core.template_seeder.SessionLocal')
    async def test_async_seed_templates_handles_exception(self, mock_session_local):
        """Test async_seed_templates handles exceptions"""
        mock_db = Mock(spec=Session)
        mock_session_local.return_value.__enter__ = Mock(return_value=mock_db)
        mock_session_local.return_value.__exit__ = Mock(return_value=False)
        
        mock_db.query.side_effect = Exception("Database connection failed")
        
        with pytest.raises(Exception):
            await async_seed_templates()


class TestTemplateValidation:
    """Test template validation and integrity"""
    
    def test_all_contract_types_covered(self):
        """Test that we have templates for major contract types"""
        template_types = {t["contract_type"] for t in TEMPLATE_DATA}
        
        # Should have templates for key UK SME contract types
        expected_types = {
            ContractType.EMPLOYMENT_CONTRACT,
            ContractType.SERVICE_AGREEMENT,
        }
        
        for expected_type in expected_types:
            assert expected_type in template_types, f"Missing template for {expected_type}"
    
    def test_template_names_unique(self):
        """Test that template names are unique"""
        names = [t["name"] for t in TEMPLATE_DATA]
        assert len(names) == len(set(names)), "Template names are not unique"
    
    def test_template_content_length(self):
        """Test that template content is substantial"""
        for template in TEMPLATE_DATA:
            content = template["template_content"]
            assert len(content) > 100, f"Template {template['name']} content too short"
            
            # Should have multiple sections/paragraphs
            assert content.count("\n") > 5, f"Template {template['name']} lacks structure"
    
    def test_uk_legal_compliance_keywords(self):
        """Test that templates include UK legal compliance keywords"""
        uk_keywords = [
            "english law", "uk", "gdpr", "data protection", 
            "employment rights", "consumer rights"
        ]
        
        for template in TEMPLATE_DATA:
            content_lower = template["template_content"].lower()
            compliance_lower = " ".join(template["compliance_features"]).lower()
            notes_lower = template["legal_notes"].lower()
            
            full_text = f"{content_lower} {compliance_lower} {notes_lower}"
            
            # Should have at least some UK legal references
            has_uk_keywords = any(keyword in full_text for keyword in uk_keywords)
            assert has_uk_keywords, f"Template {template['name']} lacks UK legal compliance keywords"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])