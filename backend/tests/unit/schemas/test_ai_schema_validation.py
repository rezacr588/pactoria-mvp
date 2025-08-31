"""
Unit tests for AI Schema Validation
Testing Pydantic validators and edge cases
"""
import pytest
from pydantic import ValidationError

from app.schemas.ai import (
    ContractAnalysisRequest,
    TemplateRecommendationRequest
)


class TestContractAnalysisRequestValidation:
    """Test ContractAnalysisRequest schema validation"""
    
    def test_contract_content_minimum_length(self):
        """Test contract content minimum length validation"""
        # Valid content (meets minimum)
        valid_request = ContractAnalysisRequest(
            contract_content="This is a valid contract content that meets the minimum length requirement for analysis.",
            contract_type="service_agreement"
        )
        assert len(valid_request.contract_content) >= 50
    
    def test_contract_content_too_short(self):
        """Test contract content validation with too short content"""
        with pytest.raises(ValidationError) as exc_info:
            ContractAnalysisRequest(
                contract_content="Too short",  # Only 9 characters
                contract_type="service_agreement"
            )
        
        error_details = str(exc_info.value)
        assert "at least 50 characters" in error_details
    
    def test_contract_content_edge_case_lengths(self):
        """Test contract content at boundary lengths"""
        # Exactly 50 characters (minimum)
        content_50 = "x" * 50
        request_50 = ContractAnalysisRequest(
            contract_content=content_50,
            contract_type="service_agreement"
        )
        assert len(request_50.contract_content) == 50
        
        # Just under 50 characters
        content_49 = "x" * 49
        with pytest.raises(ValidationError):
            ContractAnalysisRequest(
                contract_content=content_49,
                contract_type="service_agreement"
            )
    
    def test_contract_content_with_whitespace(self):
        """Test contract content validation with whitespace"""
        # Content with leading/trailing whitespace
        content_with_spaces = "   This is contract content with whitespace padding   "
        
        # Should be valid if stripped length meets minimum
        if len(content_with_spaces.strip()) >= 50:
            request = ContractAnalysisRequest(
                contract_content=content_with_spaces,
                contract_type="service_agreement"
            )
            assert request.contract_content == content_with_spaces
        
        # Test with whitespace that makes content too short
        short_with_spaces = "   short   "  # Only 5 non-space characters
        with pytest.raises(ValidationError):
            ContractAnalysisRequest(
                contract_content=short_with_spaces,
                contract_type="service_agreement"
            )
    
    def test_contract_content_with_special_characters(self):
        """Test contract content with special characters"""
        special_content = "Contract with special chars: €100, 50% deposit, & more términos legales! 🎉" * 2
        
        request = ContractAnalysisRequest(
            contract_content=special_content,
            contract_type="service_agreement"
        )
        
        assert request.contract_content == special_content
    
    def test_contract_content_with_newlines(self):
        """Test contract content with newline characters"""
        multiline_content = """
        This is a contract with multiple lines.
        
        Section 1: Terms and Conditions
        The parties agree to the following terms...
        
        Section 2: Payment Terms
        Payment shall be made within 30 days...
        """
        
        if len(multiline_content.strip()) >= 50:
            request = ContractAnalysisRequest(
                contract_content=multiline_content,
                contract_type="service_agreement"
            )
            assert request.contract_content == multiline_content


class TestTemplateRecommendationRequestValidation:
    """Test TemplateRecommendationRequest schema validation"""
    
    def test_business_description_minimum_length(self):
        """Test business description minimum length validation"""
        # Valid description (meets minimum)
        valid_request = TemplateRecommendationRequest(
            business_description="I run a consulting business that provides strategic advice to small and medium enterprises.",
            industry="consulting"
        )
        assert len(valid_request.business_description) >= 20
    
    def test_business_description_too_short(self):
        """Test business description validation with too short content"""
        with pytest.raises(ValidationError) as exc_info:
            TemplateRecommendationRequest(
                business_description="Too short",  # Only 9 characters
                industry="consulting"
            )
        
        error_details = str(exc_info.value)
        assert "at least 20 characters" in error_details
    
    def test_business_description_edge_case_lengths(self):
        """Test business description at boundary lengths"""
        # Exactly 20 characters (minimum)
        description_20 = "x" * 20
        request_20 = TemplateRecommendationRequest(
            business_description=description_20,
            industry="consulting"
        )
        assert len(request_20.business_description) == 20
        
        # Just under 20 characters
        description_19 = "x" * 19
        with pytest.raises(ValidationError):
            TemplateRecommendationRequest(
                business_description=description_19,
                industry="consulting"
            )
    
    def test_business_description_with_whitespace(self):
        """Test business description with whitespace"""
        # Description with leading/trailing whitespace
        description_with_spaces = "   I run a consulting business   "
        
        # Should be valid if stripped length meets minimum
        if len(description_with_spaces.strip()) >= 20:
            request = TemplateRecommendationRequest(
                business_description=description_with_spaces,
                industry="consulting"
            )
            assert request.business_description == description_with_spaces
        
        # Test with whitespace that makes description too short
        short_with_spaces = "   short   "  # Only 5 non-space characters
        with pytest.raises(ValidationError):
            TemplateRecommendationRequest(
                business_description=short_with_spaces,
                industry="consulting"
            )
    
    def test_business_description_with_special_characters(self):
        """Test business description with special characters"""
        special_description = "My business focuses on IT solutions & consulting for SMEs (€50K+ revenue)"
        
        request = TemplateRecommendationRequest(
            business_description=special_description,
            industry="technology"
        )
        
        assert request.business_description == special_description
    
    def test_business_description_with_newlines(self):
        """Test business description with newline characters"""
        multiline_description = """
        I operate a legal consulting firm that specializes in:
        - Contract review and drafting
        - Compliance consulting
        - Risk assessment
        """
        
        if len(multiline_description.strip()) >= 20:
            request = TemplateRecommendationRequest(
                business_description=multiline_description,
                industry="legal"
            )
            assert request.business_description == multiline_description


class TestSchemaFieldValidation:
    """Test additional schema field validations"""
    
    def test_contract_analysis_request_all_fields(self):
        """Test ContractAnalysisRequest with all optional fields"""
        request = ContractAnalysisRequest(
            contract_content="This is a comprehensive contract analysis request with sufficient content length for validation.",
            contract_type="employment_contract",
            focus_areas=["gdpr_compliance", "employment_law", "termination_clauses"],
            jurisdiction="UK",
            urgency_level="high"
        )
        
        assert request.contract_type == "employment_contract"
        assert len(request.focus_areas) == 3
        assert "gdpr_compliance" in request.focus_areas
        assert request.jurisdiction == "UK"
        assert request.urgency_level == "high"
    
    def test_template_recommendation_request_all_fields(self):
        """Test TemplateRecommendationRequest with all optional fields"""
        request = TemplateRecommendationRequest(
            business_description="I operate a technology startup focused on SaaS solutions for enterprise clients.",
            industry="technology",
            contract_value_range="£10,000-£100,000",
            duration="6-12 months",
            specific_requirements=["IP ownership", "confidentiality", "termination clauses"]
        )
        
        assert request.industry == "technology"
        assert request.contract_value_range == "£10,000-£100,000"
        assert request.duration == "6-12 months"
        assert len(request.specific_requirements) == 3
        assert "IP ownership" in request.specific_requirements
    
    def test_empty_optional_fields(self):
        """Test schemas with empty optional fields"""
        # ContractAnalysisRequest with minimal fields
        contract_request = ContractAnalysisRequest(
            contract_content="This is a minimal contract analysis request with just the required fields populated.",
            contract_type="service_agreement"
        )
        assert contract_request.focus_areas == []  # Default empty list
        
        # TemplateRecommendationRequest with minimal fields
        template_request = TemplateRecommendationRequest(
            business_description="This is a minimal business description for template recommendation.",
            industry="general"
        )
        assert template_request.specific_requirements == []  # Default empty list
    
    def test_contract_type_validation(self):
        """Test contract type enum validation"""
        valid_types = [
            "service_agreement", "employment_contract", "nda", 
            "supplier_agreement", "consultancy", "partnership", 
            "lease", "terms_conditions"
        ]
        
        for contract_type in valid_types:
            request = ContractAnalysisRequest(
                contract_content="This is a valid contract content for testing different contract types in the system.",
                contract_type=contract_type
            )
            assert request.contract_type == contract_type
        
        # Test invalid contract type
        with pytest.raises(ValidationError):
            ContractAnalysisRequest(
                contract_content="This is a contract with invalid type.",
                contract_type="invalid_contract_type"
            )


class TestValidationErrorMessages:
    """Test that validation error messages are helpful"""
    
    def test_contract_content_validation_error_message(self):
        """Test contract content validation error message"""
        with pytest.raises(ValidationError) as exc_info:
            ContractAnalysisRequest(
                contract_content="short",
                contract_type="service_agreement"
            )
        
        error = exc_info.value
        assert len(error.errors()) > 0
        
        # Check that error message mentions minimum length
        error_msg = str(error)
        assert "50" in error_msg or "characters" in error_msg or "length" in error_msg.lower()
    
    def test_business_description_validation_error_message(self):
        """Test business description validation error message"""
        with pytest.raises(ValidationError) as exc_info:
            TemplateRecommendationRequest(
                business_description="short",
                industry="consulting"
            )
        
        error = exc_info.value
        assert len(error.errors()) > 0
        
        # Check that error message mentions minimum length
        error_msg = str(error)
        assert "20" in error_msg or "characters" in error_msg or "length" in error_msg.lower()


class TestEdgeCases:
    """Test edge cases for schema validation"""
    
    def test_unicode_content(self):
        """Test schemas with unicode content"""
        unicode_content = "Contrato con acentos: ñ, ü, ç. And emojis: 📄 ⚖️ 🏢" + " " + "x" * 50
        
        request = ContractAnalysisRequest(
            contract_content=unicode_content,
            contract_type="service_agreement"
        )
        
        assert request.contract_content == unicode_content
    
    def test_very_long_content(self):
        """Test schemas with very long content"""
        long_content = "This is a very long contract content. " * 1000  # ~38,000 characters
        
        request = ContractAnalysisRequest(
            contract_content=long_content,
            contract_type="service_agreement"
        )
        
        assert len(request.contract_content) > 10000
    
    def test_null_and_empty_values(self):
        """Test schemas with null and empty values"""
        # Test empty string (should fail validation)
        with pytest.raises(ValidationError):
            ContractAnalysisRequest(
                contract_content="",
                contract_type="service_agreement"
            )
        
        # Test None value (should fail validation)
        with pytest.raises(ValidationError):
            ContractAnalysisRequest(
                contract_content=None,
                contract_type="service_agreement"
            )
    
    def test_schema_serialization(self):
        """Test schema serialization and deserialization"""
        request = ContractAnalysisRequest(
            contract_content="This is a test contract content for serialization testing purposes and validation.",
            contract_type="service_agreement",
            focus_areas=["compliance", "risk_assessment"]
        )
        
        # Test dict conversion
        request_dict = request.dict()
        assert request_dict["contract_content"] == request.contract_content
        assert request_dict["contract_type"] == request.contract_type
        assert request_dict["focus_areas"] == request.focus_areas
        
        # Test JSON serialization
        json_str = request.json()
        assert isinstance(json_str, str)
        assert "service_agreement" in json_str