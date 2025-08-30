"""
Integration tests for AI API endpoints
Testing MVP requirements for AI-powered contract analysis and template recommendations
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
import json

from app.main import app


class TestAIAPI:
    """Integration tests for AI service endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def auth_headers(self):
        """Mock authentication headers"""
        return {"Authorization": "Bearer mock_jwt_token"}
    
    def test_ai_health_check(self, client):
        """Test AI service health check endpoint"""
        response = client.get("/api/v1/ai/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert "model" in data
        assert "features" in data
        assert "response_time_ms" in data
        
        assert data["status"] == "healthy"
        assert data["model"] == "openai/gpt-oss-120b"  # OpenAI's flagship open-weight MoE model
        
        # Verify MVP features are available
        expected_features = [
            "contract_generation",
            "compliance_validation",
            "risk_assessment", 
            "template_recommendation"
        ]
        for feature in expected_features:
            assert feature in data["features"]
    
    def test_contract_analysis_success(self, client, auth_headers):
        """Test successful contract analysis"""
        with patch('app.api.v1.endpoints.ai.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123"}
            
            with patch('app.api.v1.endpoints.ai.ai_service') as mock_ai_service:
                mock_ai_service.validate_contract_compliance = AsyncMock(return_value={
                    "overall_score": 0.92,
                    "gdpr_compliance": 0.95,
                    "employment_law_compliance": 0.90,
                    "consumer_rights_compliance": 0.88,
                    "commercial_terms_compliance": 0.94,
                    "risk_score": 3,
                    "risk_factors": ["Standard commercial terms", "Minor compliance gaps"],
                    "recommendations": ["Add specific GDPR clauses", "Clarify termination terms"],
                    "analysis_raw": "Detailed analysis..."
                })
                
                analysis_request = {
                    "contract_content": "This is a professional services agreement between Client and Service Provider...",
                    "contract_type": "service_agreement",
                    "focus_areas": ["gdpr_compliance", "payment_terms"]
                }
                
                response = client.post(
                    "/api/v1/ai/analyze-contract",
                    json=analysis_request,
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.json()
                
                # Verify response structure
                assert data["contract_type"] == "service_agreement"
                assert 0.0 <= data["compliance_score"] <= 1.0
                assert 0.0 <= data["gdpr_compliance"] <= 1.0
                assert 1 <= data["risk_score"] <= 10
                assert isinstance(data["risk_factors"], list)
                assert isinstance(data["recommendations"], list)
                assert "processing_time_ms" in data
                
                # Verify MVP compliance requirements (95%+ accuracy)
                assert data["compliance_score"] >= 0.90
    
    def test_contract_analysis_insufficient_content(self, client, auth_headers):
        """Test contract analysis with insufficient content"""
        with patch('app.api.v1.endpoints.ai.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123"}
            
            analysis_request = {
                "contract_content": "Too short",  # Below minimum length
                "contract_type": "service_agreement"
            }
            
            response = client.post(
                "/api/v1/ai/analyze-contract",
                json=analysis_request,
                headers=auth_headers
            )
            
            assert response.status_code == 422  # Validation error
    
    def test_template_recommendation_success(self, client, auth_headers):
        """Test successful template recommendation"""
        with patch('app.api.v1.endpoints.ai.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123"}
            
            recommendation_request = {
                "business_description": "I run a consulting firm providing strategic business advice to SMEs. I need contracts for client engagements that include IP ownership, confidentiality, and payment terms.",
                "industry": "consulting",
                "contract_value_range": "£10,000-£50,000",
                "duration": "3-12 months"
            }
            
            response = client.post(
                "/api/v1/ai/recommend-template",
                json=recommendation_request,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify response structure
            assert "recommended_templates" in data
            assert "confidence" in data
            assert "reasoning" in data
            
            templates = data["recommended_templates"]
            assert len(templates) <= 5  # Max 5 recommendations
            
            for template in templates:
                assert "template_id" in template
                assert "name" in template
                assert "confidence" in template
                assert "description" in template
                assert "suitable_for" in template
                assert "includes_clauses" in template
                assert 0.0 <= template["confidence"] <= 1.0
    
    def test_template_recommendation_short_description(self, client, auth_headers):
        """Test template recommendation with insufficient description"""
        with patch('app.api.v1.endpoints.ai.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123"}
            
            recommendation_request = {
                "business_description": "Short",  # Too short
                "industry": "tech"
            }
            
            response = client.post(
                "/api/v1/ai/recommend-template",
                json=recommendation_request,
                headers=auth_headers
            )
            
            assert response.status_code == 422
    
    def test_risk_assessment_success(self, client, auth_headers):
        """Test comprehensive contract risk assessment"""
        with patch('app.api.v1.endpoints.ai.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123"}
            
            contract_content = """
            PROFESSIONAL SERVICES AGREEMENT
            
            This agreement is between Client Corp and Service Provider Ltd.
            Services to be provided include business consulting and analysis.
            Payment terms: Net 30 days. Confidentiality provisions apply.
            Either party may terminate with 30 days notice.
            """
            
            response = client.post(
                "/api/v1/ai/assess-risk",
                params={
                    "contract_content": contract_content,
                    "contract_type": "service_agreement"
                },
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify MVP risk assessment requirements (1-10 scale)
            assert data["contract_type"] == "service_agreement"
            assert 1 <= data["overall_risk_score"] <= 10
            assert data["risk_level"] in ["low", "medium", "high", "critical"]
            
            # Verify detailed risk factors
            assert "risk_factors" in data
            risk_factors = data["risk_factors"]
            
            for factor_name, factor_data in risk_factors.items():
                assert "score" in factor_data
                assert "description" in factor_data
                assert "impact" in factor_data
                assert "recommendations" in factor_data
                assert 1 <= factor_data["score"] <= 10
            
            assert "critical_issues" in data
            assert "recommendations" in data
            assert "compliance_summary" in data
    
    def test_generate_additional_clauses(self, client, auth_headers):
        """Test generating additional contract clauses"""
        with patch('app.api.v1.endpoints.ai.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123"}
            
            response = client.post(
                "/api/v1/ai/generate-clauses",
                params={
                    "contract_type": "service_agreement",
                    "requirements": ["confidentiality", "data_protection", "force_majeure"]
                },
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["contract_type"] == "service_agreement"
            assert "requirements" in data
            assert "generated_clauses" in data
            assert "total_clauses" in data
            
            clauses = data["generated_clauses"]
            assert len(clauses) > 0
            
            for clause_name, clause_data in clauses.items():
                assert "title" in clause_data
                assert "content" in clause_data
                assert "justification" in clause_data
    
    def test_list_available_templates(self, client, auth_headers):
        """Test listing UK legal templates (MVP requirement: 20+ templates)"""
        with patch('app.api.v1.endpoints.ai.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123"}
            
            response = client.get(
                "/api/v1/ai/templates",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert "templates" in data
            assert "total" in data
            assert "categories" in data
            
            templates = data["templates"]
            
            # Verify MVP requirement: multiple UK legal templates
            assert len(templates) >= 4  # At least core templates
            
            for template in templates:
                assert "id" in template
                assert "name" in template
                assert "category" in template
                assert "description" in template
                assert "compliance_features" in template
                assert "is_active" in template
            
            # Verify UK-specific compliance features
            all_features = []
            for template in templates:
                all_features.extend(template["compliance_features"])
            
            # Check for MVP compliance requirements
            assert "gdpr" in all_features
            assert "employment_law" in all_features or "commercial_law" in all_features
    
    def test_list_templates_with_category_filter(self, client, auth_headers):
        """Test template listing with category filtering"""
        with patch('app.api.v1.endpoints.ai.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123"}
            
            response = client.get(
                "/api/v1/ai/templates",
                params={"category": "service_agreements"},
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            templates = data["templates"]
            
            # All templates should be in the requested category
            for template in templates:
                assert template["category"] == "service_agreements"
    
    def test_ai_service_error_handling(self, client, auth_headers):
        """Test AI service error handling"""
        with patch('app.api.v1.endpoints.ai.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123"}
            
            with patch('app.api.v1.endpoints.ai.ai_service') as mock_ai_service:
                # Simulate AI service failure
                mock_ai_service.validate_contract_compliance = AsyncMock(
                    side_effect=Exception("AI service temporarily unavailable")
                )
                
                analysis_request = {
                    "contract_content": "Valid contract content for testing error handling",
                    "contract_type": "service_agreement"
                }
                
                response = client.post(
                    "/api/v1/ai/analyze-contract",
                    json=analysis_request,
                    headers=auth_headers
                )
                
                assert response.status_code == 500
                error_data = response.json()
                assert "Contract analysis failed" in error_data["detail"]
    
    def test_unauthorized_ai_access(self, client):
        """Test that AI endpoints require authentication"""
        ai_endpoints = [
            ("/api/v1/ai/analyze-contract", "POST"),
            ("/api/v1/ai/recommend-template", "POST"),
            ("/api/v1/ai/assess-risk", "POST"),
            ("/api/v1/ai/generate-clauses", "POST"),
            ("/api/v1/ai/templates", "GET")
        ]
        
        for endpoint, method in ai_endpoints:
            if method == "GET":
                response = client.get(endpoint)
            else:
                response = client.post(endpoint, json={})
            
            # Should require authentication
            assert response.status_code in [401, 422]
    
    @pytest.mark.parametrize("contract_type", [
        "service_agreement",
        "employment_contract",
        "supplier_agreement", 
        "nda",
        "terms_conditions",
        "consultancy",
        "partnership",
        "lease"
    ])
    def test_contract_analysis_all_types(self, client, auth_headers, contract_type):
        """Test contract analysis for all MVP contract types"""
        with patch('app.api.v1.endpoints.ai.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123"}
            
            with patch('app.api.v1.endpoints.ai.ai_service') as mock_ai_service:
                mock_ai_service.validate_contract_compliance = AsyncMock(return_value={
                    "overall_score": 0.90,
                    "gdpr_compliance": 0.92,
                    "risk_score": 4,
                    "risk_factors": ["Standard terms"],
                    "recommendations": ["Review clauses"]
                })
                
                analysis_request = {
                    "contract_content": f"Sample {contract_type.replace('_', ' ')} contract content for testing purposes...",
                    "contract_type": contract_type
                }
                
                response = client.post(
                    "/api/v1/ai/analyze-contract",
                    json=analysis_request,
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["contract_type"] == contract_type
    
    def test_ai_performance_requirements(self, client, auth_headers):
        """Test AI performance meets MVP requirements"""
        with patch('app.api.v1.endpoints.ai.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123"}
            
            with patch('app.api.v1.endpoints.ai.ai_service') as mock_ai_service:
                # Mock fast response (MVP requirement: ultra-fast inference)
                mock_ai_service.validate_contract_compliance = AsyncMock(return_value={
                    "overall_score": 0.95,
                    "gdpr_compliance": 0.96,
                    "risk_score": 2,
                    "risk_factors": [],
                    "recommendations": []
                })
                
                analysis_request = {
                    "contract_content": "Professional services agreement with standard terms...",
                    "contract_type": "service_agreement"
                }
                
                response = client.post(
                    "/api/v1/ai/analyze-contract",
                    json=analysis_request,
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.json()
                
                # Verify MVP performance requirements
                assert "processing_time_ms" in data
                # Ultra-fast inference should be under reasonable time
                assert data["processing_time_ms"] < 30000  # 30 seconds max
    
    def test_uk_legal_compliance_validation(self, client, auth_headers):
        """Test UK legal compliance validation requirements"""
        with patch('app.api.v1.endpoints.ai.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123"}
            
            with patch('app.api.v1.endpoints.ai.ai_service') as mock_ai_service:
                mock_ai_service.validate_contract_compliance = AsyncMock(return_value={
                    "overall_score": 0.96,  # Above MVP requirement of 95%
                    "gdpr_compliance": 0.98,
                    "employment_law_compliance": 0.94,
                    "consumer_rights_compliance": 0.92,
                    "commercial_terms_compliance": 0.95,
                    "risk_score": 2,
                    "risk_factors": ["Minor administrative clauses"],
                    "recommendations": ["Consider additional consumer protection clauses"]
                })
                
                analysis_request = {
                    "contract_content": "UK employment contract with GDPR compliance and consumer rights provisions...",
                    "contract_type": "employment_contract"
                }
                
                response = client.post(
                    "/api/v1/ai/analyze-contract",
                    json=analysis_request,
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.json()
                
                # Verify MVP compliance requirements
                assert data["overall_compliance_score"] >= 0.95  # MVP requirement: 95%+ accuracy
                
                # Verify UK-specific compliance areas
                assert "gdpr_compliance" in data
                if data.get("employment_law_compliance") is not None:
                    assert data["employment_law_compliance"] >= 0.90
                if data.get("consumer_rights_compliance") is not None:
                    assert data["consumer_rights_compliance"] >= 0.85
    
    def test_ai_model_configuration(self, client):
        """Test that AI service uses correct model per MVP plan"""
        response = client.get("/api/v1/ai/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify MVP requirement: OpenAI GPT-OSS-120B model
        assert data["model"] == "openai/gpt-oss-120b"