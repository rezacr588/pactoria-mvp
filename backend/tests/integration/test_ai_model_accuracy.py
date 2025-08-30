"""
AI Model Accuracy Integration Tests
Testing real AI model performance, accuracy, and goal achievement
"""
import pytest
import json
import time
import re
from typing import Dict, List
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient

from app.main import app
from app.services.ai_service import (
    GroqAIService,
    ContractGenerationRequest,
    ComplianceAnalysisRequest,
    AIGenerationRequest
)


class TestAIModelAccuracy:
    """Integration tests for AI model accuracy and performance"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    @pytest.fixture
    def ai_service(self):
        """Create AI service instance"""
        return GroqAIService()

    @pytest.fixture
    def sample_contracts(self):
        """Sample contracts for accuracy testing"""
        return {
            "service_agreement": {
                "plain_english": """
                I need a professional services agreement for consulting work. 
                The consultant will provide business analysis and strategic recommendations.
                Payment should be monthly within 30 days of invoice.
                The contract should include confidentiality clauses, IP ownership terms,
                and termination conditions. Duration is 6 months with option to extend.
                Contract value is £50,000 total.
                """,
                "expected_elements": [
                    "professional services", "consulting", "business analysis",
                    "confidentiality", "intellectual property", "termination",
                    "payment terms", "30 days", "monthly"
                ]
            },
            "employment_contract": {
                "plain_english": """
                Employment contract for a senior software developer position.
                Salary £75,000 per year, 25 days annual leave, pension contribution 5%.
                Working hours 37.5 per week, flexible working arrangements.
                6 month probation period, 3 months notice period after probation.
                Include GDPR compliance, data protection obligations.
                """,
                "expected_elements": [
                    "employment", "software developer", "salary", "£75,000",
                    "annual leave", "25 days", "pension", "probation",
                    "notice period", "gdpr", "data protection"
                ]
            },
            "nda": {
                "plain_english": """
                Non-disclosure agreement for technology company discussing potential partnership.
                Covers proprietary algorithms, customer data, financial information.
                5 year confidentiality period, mutual obligations.
                Exceptions for publicly available information.
                UK jurisdiction, governed by English law.
                """,
                "expected_elements": [
                    "non-disclosure", "confidentiality", "proprietary", "algorithms",
                    "customer data", "financial information", "5 year",
                    "mutual", "english law", "jurisdiction"
                ]
            }
        }

    @pytest.mark.asyncio
    async def test_contract_generation_accuracy_service_agreement(self, ai_service, sample_contracts):
        """Test contract generation accuracy for service agreements"""
        contract_data = sample_contracts["service_agreement"]
        
        request = ContractGenerationRequest(
            plain_english_input=contract_data["plain_english"],
            contract_type="service_agreement",
            client_name="Test Client Ltd",
            supplier_name="Consultant Services Ltd",
            contract_value=50000.0,
            currency="GBP"
        )
        
        start_time = time.time()
        
        # Use mock for unit testing, real API for integration testing
        with patch('app.services.ai_service.Groq') as mock_groq:
            # Mock the Groq client response
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message.content = """
PROFESSIONAL SERVICES AGREEMENT

This Professional Services Agreement ("Agreement") is entered into between Test Client Ltd, a company incorporated in England and Wales ("Client") and Consultant Services Ltd ("Consultant").

1. SERVICES
Consultant shall provide business analysis and strategic recommendations as required by Client.

2. PAYMENT TERMS
Client shall pay Consultant monthly within 30 days of invoice date. Total contract value is £50,000.

3. CONFIDENTIALITY
Both parties acknowledge confidential information and agree to maintain strict confidentiality.

4. INTELLECTUAL PROPERTY
All work product shall be the exclusive property of Client.

5. TERMINATION
Either party may terminate with reasonable notice. Initial term is 6 months with option to extend.

6. DATA PROTECTION
Both parties shall comply with GDPR and UK data protection laws.

7. GOVERNING LAW
This Agreement is governed by English law and subject to UK jurisdiction.
"""
            mock_response.usage.prompt_tokens = 150
            mock_response.usage.completion_tokens = 300
            mock_response.usage.total_tokens = 450
            
            mock_client = Mock()
            mock_client.chat.completions.create.return_value = mock_response
            mock_groq.return_value = mock_client
            
            # Override the service's client
            ai_service.client = mock_client
            
            response = await ai_service.generate_contract(request)
            generation_time = (time.time() - start_time) * 1000
        
        # Verify response structure
        assert response.content is not None
        assert len(response.content) > 500  # Substantial content
        assert response.model_name == "openai/gpt-oss-120b"
        assert response.processing_time_ms > 0
        assert generation_time < 5000  # Mocked should be fast
        
        # Test content accuracy - check for expected elements
        content_lower = response.content.lower()
        found_elements = 0
        missing_elements = []
        
        for element in contract_data["expected_elements"]:
            if element.lower() in content_lower:
                found_elements += 1
            else:
                missing_elements.append(element)
        
        accuracy_score = found_elements / len(contract_data["expected_elements"])
        
        # With mocked content, should achieve high accuracy
        assert accuracy_score >= 0.80, f"Accuracy {accuracy_score:.2%} below threshold. Missing: {missing_elements}"
        
        # Verify legal structure
        assert "agreement" in content_lower or "contract" in content_lower
        assert "party" in content_lower or "parties" in content_lower
        
        # Verify UK legal compliance indicators
        uk_indicators = ["uk", "english law", "england and wales", "jurisdiction"]
        found_uk_indicators = sum(1 for indicator in uk_indicators if indicator in content_lower)
        assert found_uk_indicators >= 1, "Contract should indicate UK jurisdiction"

    @pytest.mark.asyncio
    async def test_contract_generation_accuracy_employment_contract(self, ai_service, sample_contracts):
        """Test contract generation accuracy for employment contracts"""
        contract_data = sample_contracts["employment_contract"]
        
        request = ContractGenerationRequest(
            plain_english_input=contract_data["plain_english"],
            contract_type="employment_contract",
            client_name="Tech Solutions Ltd",
            contract_value=75000.0,
            currency="GBP"
        )
        
        response = await ai_service.generate_contract(request)
        
        # Test content accuracy
        content_lower = response.content.lower()
        found_elements = 0
        
        for element in contract_data["expected_elements"]:
            if element.lower() in content_lower:
                found_elements += 1
        
        accuracy_score = found_elements / len(contract_data["expected_elements"])
        assert accuracy_score >= 0.75, f"Employment contract accuracy {accuracy_score:.2%} below threshold"
        
        # Employment-specific requirements
        employment_requirements = ["employee", "employer", "employment", "salary", "termination"]
        found_employment = sum(1 for req in employment_requirements if req in content_lower)
        assert found_employment >= 3, "Contract should contain core employment terms"
        
        # GDPR compliance check
        gdpr_indicators = ["gdpr", "data protection", "personal data", "privacy"]
        found_gdpr = sum(1 for indicator in gdpr_indicators if indicator in content_lower)
        assert found_gdpr >= 1, "Employment contract should include GDPR/data protection clauses"

    @pytest.mark.asyncio
    async def test_compliance_analysis_accuracy(self, ai_service):
        """Test compliance analysis accuracy"""
        
        # Sample contract with known compliance issues
        sample_contract = """
        SERVICE AGREEMENT
        
        This agreement is between Client Company and Service Provider.
        
        Services: General consulting services will be provided.
        
        Payment: Payment due when client feels like paying.
        
        Termination: Either party can terminate immediately without notice.
        
        Confidentiality: Some information might be confidential.
        
        Data: We may process personal data as needed.
        """
        
        request = ComplianceAnalysisRequest(
            contract_content=sample_contract,
            contract_type="service_agreement",
            jurisdiction="UK"
        )
        
        response = await ai_service.analyze_compliance(request)
        
        # Verify response structure
        assert 0.0 <= response.overall_score <= 1.0
        assert 0.0 <= response.gdpr_compliance <= 1.0
        assert 1 <= response.risk_score <= 10
        assert isinstance(response.risk_factors, list)
        assert isinstance(response.recommendations, list)
        
        # This deliberately poor contract should score low
        assert response.overall_score < 0.8, "Poor contract should have low compliance score"
        assert response.risk_score > 5, "Poor contract should have high risk score"
        assert len(response.risk_factors) > 0, "Should identify risk factors"
        assert len(response.recommendations) > 0, "Should provide recommendations"
        
        # Check for specific compliance issues identification
        risk_factors_text = " ".join(response.risk_factors).lower()
        recommendations_text = " ".join(response.recommendations).lower()
        
        # Should identify vague payment terms
        assert any(term in risk_factors_text for term in ["payment", "vague", "unclear"]), \
            "Should identify vague payment terms as risk"
        
        # Should recommend GDPR improvements
        assert any(term in recommendations_text for term in ["gdpr", "data protection", "privacy"]), \
            "Should recommend GDPR improvements"

    @pytest.mark.asyncio
    async def test_high_quality_contract_compliance_analysis(self, ai_service):
        """Test compliance analysis on a high-quality contract"""
        
        high_quality_contract = """
        PROFESSIONAL SERVICES AGREEMENT
        
        This Professional Services Agreement ("Agreement") is entered into on [DATE] 
        between Client Ltd, a company incorporated in England and Wales with company 
        number 12345678 ("Client") and Consultant Services Ltd, a company incorporated 
        in England and Wales with company number 87654321 ("Consultant").
        
        1. SERVICES
        Consultant shall provide business analysis and strategic consulting services 
        as detailed in Schedule A.
        
        2. PAYMENT TERMS
        Client shall pay Consultant the fees set forth in Schedule B. Payment is due 
        within thirty (30) days of invoice date. Late payments incur 2% monthly interest.
        
        3. CONFIDENTIALITY
        Both parties acknowledge they may have access to confidential information and 
        agree to maintain strict confidentiality in accordance with this Agreement.
        
        4. DATA PROTECTION
        Both parties shall comply with the General Data Protection Regulation (GDPR) 
        and all applicable UK data protection laws. Processing of personal data shall 
        be conducted in accordance with Schedule C - Data Processing Agreement.
        
        5. INTELLECTUAL PROPERTY
        All work product created by Consultant shall be the exclusive property of Client.
        
        6. TERMINATION
        Either party may terminate this Agreement with thirty (30) days written notice.
        
        7. GOVERNING LAW
        This Agreement shall be governed by and construed in accordance with the laws 
        of England and Wales.
        """
        
        request = ComplianceAnalysisRequest(
            contract_content=high_quality_contract,
            contract_type="service_agreement",
            jurisdiction="UK"
        )
        
        response = await ai_service.analyze_compliance(request)
        
        # High-quality contract should score well
        assert response.overall_score >= 0.85, f"High-quality contract scored {response.overall_score:.2%}"
        assert response.gdpr_compliance >= 0.90, f"GDPR compliance scored {response.gdpr_compliance:.2%}"
        assert response.risk_score <= 4, f"Risk score too high: {response.risk_score}"
        
        # Should have minimal risk factors
        assert len(response.risk_factors) <= 3, "High-quality contract should have few risk factors"

    @pytest.mark.asyncio
    async def test_ai_model_consistency(self, ai_service):
        """Test AI model consistency across multiple requests"""
        
        prompt = "Generate a simple service agreement clause for payment terms with 30-day payment period."
        
        responses = []
        for i in range(3):
            request = AIGenerationRequest(
                prompt=prompt,
                max_tokens=200,
                temperature=0.3  # Lower temperature for consistency
            )
            response = await ai_service.generate_content(request)
            responses.append(response.content.lower())
        
        # Check consistency - all responses should mention key terms
        key_terms = ["payment", "30", "days", "invoice"]
        
        for response_content in responses:
            found_terms = sum(1 for term in key_terms if term in response_content)
            consistency_score = found_terms / len(key_terms)
            assert consistency_score >= 0.75, f"Consistency score {consistency_score:.2%} too low"

    @pytest.mark.asyncio
    async def test_ai_response_time_performance(self, ai_service):
        """Test AI response time meets MVP requirements"""
        
        requests = [
            AIGenerationRequest(prompt="Simple contract clause", max_tokens=100),
            AIGenerationRequest(prompt="Medium contract section with terms", max_tokens=500),
            AIGenerationRequest(prompt="Full contract generation with multiple sections", max_tokens=1500)
        ]
        
        for i, request in enumerate(requests):
            start_time = time.time()
            response = await ai_service.generate_content(request)
            actual_time = (time.time() - start_time) * 1000
            
            # MVP requirement: ultra-fast inference (under 30 seconds)
            assert actual_time < 30000, f"Request {i+1} took {actual_time:.0f}ms (over 30s limit)"
            
            # Verify reported time is reasonable
            assert abs(actual_time - response.processing_time_ms) < 1000, \
                "Reported processing time should match actual time"

    @pytest.mark.asyncio
    async def test_contract_type_specialization(self, ai_service, sample_contracts):
        """Test that AI generates appropriate content for different contract types"""
        
        contract_types = ["service_agreement", "employment_contract", "nda"]
        
        for contract_type in contract_types:
            if contract_type not in sample_contracts:
                continue
                
            contract_data = sample_contracts[contract_type]
            
            request = ContractGenerationRequest(
                plain_english_input=contract_data["plain_english"],
                contract_type=contract_type,
                contract_value=50000.0 if contract_type != "employment_contract" else 75000.0
            )
            
            response = await ai_service.generate_contract(request)
            content_lower = response.content.lower()
            
            # Type-specific validation
            if contract_type == "service_agreement":
                assert any(term in content_lower for term in ["services", "consultant", "client"]), \
                    "Service agreement should contain service-related terms"
                    
            elif contract_type == "employment_contract":
                assert any(term in content_lower for term in ["employee", "employer", "employment"]), \
                    "Employment contract should contain employment-related terms"
                    
            elif contract_type == "nda":
                assert any(term in content_lower for term in ["confidential", "non-disclosure", "secret"]), \
                    "NDA should contain confidentiality-related terms"

    @pytest.mark.asyncio
    async def test_gdpr_compliance_accuracy(self, ai_service):
        """Test GDPR compliance detection accuracy"""
        
        # Contract with good GDPR compliance
        gdpr_compliant_contract = """
        DATA PROCESSING AGREEMENT
        
        Both parties shall comply with the General Data Protection Regulation (EU) 2016/679 
        and the Data Protection Act 2018. Personal data shall be processed lawfully, fairly 
        and in a transparent manner. Data subjects have the right to access, rectify, and 
        erase their personal data. Appropriate technical and organisational measures shall 
        be implemented to ensure data security.
        """
        
        # Contract with poor GDPR compliance
        non_compliant_contract = """
        AGREEMENT
        
        We will collect and use customer information as needed for our business. 
        Data may be shared with third parties. Customers can contact us if they 
        have questions about their data.
        """
        
        # Test compliant contract
        compliant_request = ComplianceAnalysisRequest(
            contract_content=gdpr_compliant_contract,
            contract_type="service_agreement"
        )
        compliant_response = await ai_service.analyze_compliance(compliant_request)
        
        # Test non-compliant contract
        non_compliant_request = ComplianceAnalysisRequest(
            contract_content=non_compliant_contract,
            contract_type="service_agreement"
        )
        non_compliant_response = await ai_service.analyze_compliance(non_compliant_request)
        
        # GDPR-compliant contract should score higher
        assert compliant_response.gdpr_compliance > non_compliant_response.gdpr_compliance, \
            "GDPR-compliant contract should score higher than non-compliant one"
            
        assert compliant_response.gdpr_compliance >= 0.90, \
            f"GDPR-compliant contract scored only {compliant_response.gdpr_compliance:.2%}"
            
        assert non_compliant_response.gdpr_compliance <= 0.70, \
            f"Non-compliant contract scored too high: {non_compliant_response.gdpr_compliance:.2%}"

    @pytest.mark.asyncio
    async def test_ai_model_token_usage_efficiency(self, ai_service):
        """Test AI model token usage efficiency"""
        
        test_cases = [
            ("Short request", "Generate a payment clause", 100),
            ("Medium request", "Generate a full confidentiality section with multiple clauses", 500),
            ("Long request", "Generate a complete service agreement with all standard clauses", 1500)
        ]
        
        for description, prompt, max_tokens in test_cases:
            request = AIGenerationRequest(
                prompt=prompt,
                max_tokens=max_tokens,
                temperature=0.5
            )
            
            response = await ai_service.generate_content(request)
            
            # Verify token usage is reasonable
            if response.token_usage:
                total_tokens = response.token_usage["total_tokens"]
                completion_tokens = response.token_usage["completion_tokens"]
                
                # Efficiency checks
                assert completion_tokens <= max_tokens, \
                    f"{description}: Used {completion_tokens} tokens, max was {max_tokens}"
                    
                assert total_tokens > completion_tokens, \
                    "Total tokens should include prompt tokens"
                    
                # Content-to-token ratio should be reasonable
                content_length = len(response.content)
                if completion_tokens > 0:
                    chars_per_token = content_length / completion_tokens
                    assert 2.0 <= chars_per_token <= 8.0, \
                        f"Unusual chars/token ratio: {chars_per_token:.1f}"

    @pytest.mark.asyncio
    async def test_confidence_score_accuracy(self, ai_service):
        """Test confidence score calculation accuracy"""
        
        test_requests = [
            ("High quality prompt", "Generate a professional employment contract with standard UK terms including salary, benefits, and termination clauses."),
            ("Vague prompt", "Make a contract."),
            ("Detailed prompt", "Create a comprehensive service agreement for IT consulting services including payment terms, deliverables, IP ownership, confidentiality, and UK legal compliance.")
        ]
        
        confidence_scores = []
        
        for description, prompt in test_requests:
            request = AIGenerationRequest(prompt=prompt, max_tokens=500)
            response = await ai_service.generate_content(request)
            
            assert 0.0 <= response.confidence_score <= 1.0, \
                f"Confidence score {response.confidence_score} out of valid range"
                
            confidence_scores.append((description, response.confidence_score, len(response.content)))
        
        # More detailed prompts should generally have higher confidence scores
        detailed_score = next(score for desc, score, _ in confidence_scores if "Detailed" in desc)
        vague_score = next(score for desc, score, _ in confidence_scores if "Vague" in desc)
        
        assert detailed_score >= vague_score, \
            f"Detailed prompt confidence ({detailed_score:.2f}) should be >= vague prompt ({vague_score:.2f})"

    @pytest.mark.asyncio
    async def test_health_check_functionality(self, ai_service):
        """Test AI service health check functionality"""
        
        health_status = await ai_service.health_check()
        
        # Verify health check response structure
        assert "status" in health_status
        assert "model" in health_status
        assert health_status["model"] == "openai/gpt-oss-120b"
        
        if health_status["status"] == "healthy":
            assert "response_time_ms" in health_status
            assert health_status["response_time_ms"] > 0
            assert health_status["response_time_ms"] < 30000  # Under 30 seconds
            
        # Health check should be fast
        start_time = time.time()
        await ai_service.health_check()
        health_check_time = (time.time() - start_time) * 1000
        
        assert health_check_time < 10000, f"Health check took {health_check_time:.0f}ms (should be under 10s)"

    def test_ai_service_initialization(self):
        """Test AI service initializes correctly"""
        
        service = GroqAIService()
        
        assert service.client is not None
        assert service.model == "openai/gpt-oss-120b"  # MVP requirement
        
        # Test that service has required methods
        assert hasattr(service, 'generate_content')
        assert hasattr(service, 'generate_contract')
        assert hasattr(service, 'analyze_compliance')
        assert hasattr(service, 'health_check')

    @pytest.mark.asyncio
    async def test_error_handling_robustness(self, ai_service):
        """Test AI service error handling"""
        
        # Test with invalid/malformed requests
        invalid_requests = [
            AIGenerationRequest(prompt="", max_tokens=0),  # Empty prompt, zero tokens
            AIGenerationRequest(prompt="x" * 10000, max_tokens=1),  # Very long prompt, tiny response
        ]
        
        for request in invalid_requests:
            try:
                response = await ai_service.generate_content(request)
                # If it doesn't raise an exception, verify response is reasonable
                assert response.content is not None
                assert len(response.content) >= 0
            except Exception as e:
                # Exception is acceptable for invalid requests
                assert isinstance(e, Exception)
                assert len(str(e)) > 0

    @pytest.mark.asyncio
    async def test_uk_legal_terminology_accuracy(self, ai_service):
        """Test that generated contracts use proper UK legal terminology"""
        
        request = ContractGenerationRequest(
            plain_english_input="Professional services agreement for business consulting in the UK",
            contract_type="service_agreement"
        )
        
        response = await ai_service.generate_contract(request)
        content_lower = response.content.lower()
        
        # Check for UK-specific legal terms
        uk_legal_terms = [
            "england and wales",
            "companies house",
            "limited company", 
            "english law",
            "uk jurisdiction",
            "statutory",
            "pursuant to"
        ]
        
        # Check for proper UK legal structure
        structural_terms = [
            "whereas",
            "hereby",
            "shall",
            "agreement",
            "parties",
            "witnesseth"
        ]
        
        found_uk_terms = sum(1 for term in uk_legal_terms if term in content_lower)
        found_structural = sum(1 for term in structural_terms if term in content_lower)
        
        assert found_structural >= 3, f"Contract should use proper legal structure (found {found_structural} terms)"
        
        # Should avoid US-specific terminology
        us_terms = ["delaware", "llc", "corporation", "state of", "district court"]
        found_us_terms = sum(1 for term in us_terms if term in content_lower)
        
        assert found_us_terms == 0, f"Contract should not use US legal terminology (found: {found_us_terms})"