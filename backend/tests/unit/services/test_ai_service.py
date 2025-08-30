"""
Unit tests for AI Service - Groq-powered contract generation
Testing MVP requirements for AI contract generation and compliance validation
"""
import pytest
from unittest.mock import AsyncMock, Mock, patch
from app.services.ai_service import (
    GroqAIService, 
    ContractGenerationRequest, 
    ComplianceAnalysisRequest,
    AIGenerationRequest
)


class TestGroqAIService:
    """Test cases for Groq AI service functionality"""
    
    @pytest.fixture
    def ai_service(self, mock_settings):
        """Create AI service instance for testing"""
        with patch('app.services.ai_service.settings', mock_settings):
            return GroqAIService()
    
    @pytest.mark.asyncio
    async def test_generate_contract_success(self, ai_service):
        """Test successful contract generation"""
        # Mock Groq API response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "GENERATED_CONTRACT_CONTENT"
        mock_response.usage = Mock()
        mock_response.usage.prompt_tokens = 150
        mock_response.usage.completion_tokens = 800
        mock_response.usage.total_tokens = 950
        
        # Mock the client
        mock_client = Mock()
        mock_client.chat.completions.create = Mock(return_value=mock_response)
        ai_service.client = mock_client
        
        # Test contract generation
        request = ContractGenerationRequest(
            plain_english_input="I need a service agreement with payment terms",
            contract_type="service_agreement"
        )
        
        response = await ai_service.generate_contract(request)
        
        # Assertions
        assert response.content == "GENERATED_CONTRACT_CONTENT"
        assert response.model_name == "openai/gpt-oss-120b"
        assert response.token_usage["prompt_tokens"] == 150
        assert response.token_usage["completion_tokens"] == 800
        assert response.processing_time_ms > 0
        assert 0.0 <= response.confidence_score <= 1.0
        
        # Verify API call
        mock_client.chat.completions.create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_generate_contract_with_company_details(self, ai_service):
        """Test contract generation with company details"""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "CONTRACT_WITH_COMPANY_DETAILS"
        mock_response.usage = Mock()
        mock_response.usage.prompt_tokens = 200
        mock_response.usage.completion_tokens = 900
        mock_response.usage.total_tokens = 1100
        
        mock_client = Mock()
        mock_client.chat.completions.create = Mock(return_value=mock_response)
        ai_service.client = mock_client
        
        request = ContractGenerationRequest(
            plain_english_input="Need employment contract for full-time developer",
            contract_type="employment_contract",
            client_name="Test Company Ltd",
            supplier_name="John Developer",
            contract_value=50000.0,
            currency="GBP"
        )
        
        response = await ai_service.generate_contract(request)
        
        assert response.content == "CONTRACT_WITH_COMPANY_DETAILS"
        assert response.token_usage["total_tokens"] == 1100
    
    def test_build_contract_prompt(self, ai_service):
        """Test contract prompt building"""
        request = ContractGenerationRequest(
            plain_english_input="Need consulting contract",
            contract_type="service_agreement",
            client_name="Test Company",
            contract_value=5000.0
        )
        
        prompt = ai_service._build_contract_prompt(request)
        
        assert "service_agreement" in prompt.lower()
        assert "Need consulting contract" in prompt
        assert "Test Company" in prompt
        assert "5000" in prompt
        assert "UK law" in prompt
        assert "GDPR" in prompt
    
    @pytest.mark.asyncio
    async def test_analyze_compliance(self, ai_service):
        """Test compliance analysis"""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = """
        {
            "overall_score": 0.88,
            "gdpr_compliance": 0.90,
            "employment_law_compliance": 0.85,
            "consumer_rights_compliance": 0.88,
            "commercial_terms_compliance": 0.90,
            "risk_score": 4,
            "risk_factors": ["Missing termination clause"],
            "recommendations": ["Add proper termination procedures"]
        }
        """
        mock_response.usage = Mock()
        mock_response.usage.prompt_tokens = 300
        mock_response.usage.completion_tokens = 200
        mock_response.usage.total_tokens = 500
        
        mock_client = Mock()
        mock_client.chat.completions.create = Mock(return_value=mock_response)
        ai_service.client = mock_client
        
        request = ComplianceAnalysisRequest(
            contract_content="Sample contract content",
            contract_type="service_agreement",
            jurisdiction="UK"
        )
        
        response = await ai_service.analyze_compliance(request)
        
        assert response.overall_score == 0.88
        assert response.gdpr_compliance == 0.90
        assert response.risk_score == 4
        assert "Missing termination clause" in response.risk_factors
        assert "Add proper termination procedures" in response.recommendations
    
    def test_calculate_confidence_score(self, ai_service):
        """Test confidence score calculation"""
        content = "This is a well-structured legal contract with proper clauses and UK compliance."
        prompt = "Generate a service agreement contract"
        
        score = ai_service._calculate_confidence_score(content, prompt)
        
        assert 0.0 <= score <= 1.0
        assert score > 0.5  # Should be reasonably high for good content
    
    @pytest.mark.asyncio
    async def test_health_check(self, ai_service):
        """Test AI service health check"""
        # Mock the health check call to prevent real API call
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "AI service is healthy"
        mock_response.usage = Mock()
        mock_response.usage.prompt_tokens = 10
        mock_response.usage.completion_tokens = 5
        mock_response.usage.total_tokens = 15
        
        mock_client = Mock()
        mock_client.chat.completions.create = Mock(return_value=mock_response)
        ai_service.client = mock_client
        
        health = await ai_service.health_check()
        
        assert "status" in health
        assert "model" in health
        assert health["status"] == "healthy"
        assert health["model"] == "openai/gpt-oss-120b"
    
    @pytest.mark.asyncio
    async def test_generate_content_generic(self, ai_service):
        """Test generic content generation"""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Generated content"
        mock_response.usage = Mock()
        mock_response.usage.prompt_tokens = 50
        mock_response.usage.completion_tokens = 100
        mock_response.usage.total_tokens = 150
        
        mock_client = Mock()
        mock_client.chat.completions.create = Mock(return_value=mock_response)
        ai_service.client = mock_client
        
        request = AIGenerationRequest(
            prompt="Generate some legal text",
            max_tokens=1000,
            temperature=0.7
        )
        
        response = await ai_service.generate_content(request)
        
        assert response.content == "Generated content"
        assert response.model_name == "openai/gpt-oss-120b"
        assert response.token_usage["total_tokens"] == 150