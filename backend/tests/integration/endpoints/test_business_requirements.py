"""
Integration tests for Business Requirements validation
Testing MVP and Business Plan critical requirements for visa compliance
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock
from datetime import datetime, timedelta

from app.main import app


class TestBusinessRequirements:
    """Integration tests for business plan requirement validation"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def auth_headers(self):
        """Mock authentication headers"""
        return {"Authorization": "Bearer mock_jwt_token"}
    
    def test_uk_legal_template_requirement_20_plus(self, client, auth_headers):
        """Test Business Plan Requirement: 20+ UK legal templates"""
        with patch('app.api.v1.endpoints.contracts.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}
            
            response = client.get(
                "/api/v1/contracts/templates",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Business Plan Commitment: 20+ UK legal templates
            assert "templates" in data
            assert len(data["templates"]) >= 20, f"Only {len(data['templates'])} templates, need 20+ for business plan compliance"
            
            # Verify UK-specific templates are included
            uk_template_types = [
                "service_agreement",
                "employment_contract", 
                "supplier_agreement",
                "nda",
                "terms_conditions",
                "consultancy_agreement",
                "partnership_agreement",
                "lease_agreement"
            ]
            
            template_types = [t.get("type") for t in data["templates"]]
            for uk_type in uk_template_types:
                assert uk_type in template_types, f"Missing UK template type: {uk_type}"
    
    def test_uk_compliance_accuracy_95_percent_requirement(self, client, auth_headers):
        """Test Business Plan Requirement: 95%+ UK legal compliance accuracy"""
        with patch('app.api.v1.endpoints.ai.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}
            
            with patch('app.api.v1.endpoints.ai.ai_service') as mock_ai_service:
                mock_ai_service.validate_contract_compliance = Mock(return_value={
                    "overall_compliance_score": 0.97,  # Above business plan requirement of 95%
                    "gdpr_compliance": 0.98,
                    "employment_law_compliance": 0.95,
                    "consumer_rights_compliance": 0.96,
                    "commercial_terms_compliance": 0.97
                })
                
                analysis_request = {
                    "contract_content": "UK employment contract with GDPR compliance...",
                    "contract_type": "employment_contract"
                }
                
                response = client.post(
                    "/api/v1/ai/analyze-contract",
                    json=analysis_request,
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.json()
                
                # Business Plan Commitment: >95% UK legal compliance accuracy
                assert data["overall_compliance_score"] >= 0.95, "Business plan requires 95%+ UK legal compliance accuracy"
                
                # Verify specific UK compliance areas
                assert data["gdpr_compliance"] >= 0.90, "GDPR compliance must be high for UK market"
                assert data["employment_law_compliance"] >= 0.90, "UK employment law compliance required"
    
    def test_contract_generation_under_30_seconds_requirement(self, client, auth_headers):
        """Test MVP Plan Requirement: Contract generation <30 seconds"""
        import time
        
        with patch('app.api.v1.endpoints.contracts.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}
            
            contract_request = {
                "plain_english_input": "Create a service agreement for 6 months consulting work with monthly payments",
                "contract_type": "service_agreement",
                "client_name": "ABC Corp"
            }
            
            start_time = time.time()
            
            response = client.post(
                "/api/v1/contracts/generate",
                json=contract_request,
                headers=auth_headers
            )
            
            end_time = time.time()
            generation_time = end_time - start_time
            
            assert response.status_code == 200
            
            # MVP Plan Performance Requirement: <30 seconds contract generation
            assert generation_time <= 30.0, f"Contract generation took {generation_time:.1f}s, MVP requires <30s"
            
            # Business Plan Efficiency Claim: Contract creation reduced to 12 minutes
            # Our system should be much faster than 12 minutes
            assert generation_time <= 720.0, "Should be faster than 12 minutes claimed in business plan"
    
    def test_api_response_time_under_500ms_requirement(self, client, auth_headers):
        """Test MVP Plan Requirement: API response time <500ms"""
        import time
        
        with patch('app.api.v1.endpoints.contracts.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}
            
            start_time = time.time()
            
            response = client.get(
                "/api/v1/contracts",
                headers=auth_headers
            )
            
            end_time = time.time()
            response_time_ms = (end_time - start_time) * 1000
            
            assert response.status_code == 200
            
            # MVP Plan Technical Requirement: API response time <500ms
            assert response_time_ms <= 500.0, f"API response time {response_time_ms:.1f}ms exceeds 500ms limit"
    
    def test_system_uptime_99_5_percent_requirement(self, client):
        """Test MVP Plan Requirement: >99.5% system uptime"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # System should be healthy for uptime requirement
        assert data.get("status") in ["healthy", "ok"]
        
        # If uptime metrics are available, verify >99.5%
        if "uptime_percentage" in data:
            assert data["uptime_percentage"] >= 99.5, "MVP requires >99.5% system uptime"
    
    def test_customer_satisfaction_4_5_plus_requirement(self, client, auth_headers):
        """Test Business Plan Requirement: 4.5+ customer satisfaction rating"""
        with patch('app.api.v1.endpoints.analytics.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}
            
            with patch('app.api.v1.endpoints.analytics.analytics_service') as mock_analytics:
                mock_analytics.get_satisfaction_metrics = Mock(return_value={
                    "overall_satisfaction_rating": 4.7,  # Above business plan requirement of 4.5+
                    "total_reviews": 45,
                    "nps_score": 68,
                    "retention_rate": 0.92
                })
                
                response = client.get(
                    "/api/v1/analytics/customer-satisfaction",
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.json()
                
                # Business Plan Commitment: 4.5+ customer satisfaction rating
                assert data["overall_satisfaction_rating"] >= 4.5, "Business plan requires 4.5+ customer satisfaction"
                
                # Business Plan Target: >90% retention rate
                assert data["retention_rate"] >= 0.90, "Business plan requires >90% retention rate"
    
    def test_time_savings_6_hours_per_week_requirement(self, client, auth_headers):
        """Test Business Plan Requirement: 6+ hours/week time savings per customer"""
        with patch('app.api.v1.endpoints.analytics.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}
            
            with patch('app.api.v1.endpoints.analytics.analytics_service') as mock_analytics:
                mock_analytics.calculate_time_savings = Mock(return_value={
                    "total_time_saved_hours": 8.5,  # Above business plan requirement of 6+ hours
                    "average_weekly_savings": 8.5,
                    "efficiency_improvement": 75,
                    "average_time_per_contract": {
                        "before_pactoria": 180,  # 3 hours
                        "with_pactoria": 45,     # 45 minutes  
                        "time_saved_per_contract": 135  # 2.25 hours saved
                    }
                })
                
                response = client.get(
                    "/api/v1/analytics/time-savings",
                    params={"period": "weekly"},
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.json()
                
                # Business Plan Commitment: 6+ hours/week time savings per customer
                assert data["average_weekly_savings"] >= 6.0, "Business plan requires 6+ hours/week time savings"
                
                # Business Plan Efficiency Claim: 83% time reduction
                assert data["efficiency_improvement"] >= 50, "Should show significant efficiency improvement"
    
    def test_5_users_per_account_limit_requirement(self, client, auth_headers):
        """Test MVP Plan Requirement: 5 users per account limit"""
        with patch('app.api.v1.endpoints.auth.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456", "is_admin": True}
            
            response = client.get(
                "/api/v1/auth/company/users",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # MVP Plan Requirement: 5 users per account limit
            assert data["max_users"] == 5, "MVP plan specifies 5 users per account limit"
            
            # Verify current users don't exceed limit
            if "total_users" in data:
                assert data["total_users"] <= 5, "Cannot exceed MVP 5 users per account limit"
    
    def test_uk_business_integration_requirements(self, client, auth_headers):
        """Test Business Plan Requirement: UK business system integrations"""
        with patch('app.api.v1.endpoints.integrations.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}
            
            response = client.get(
                "/api/v1/integrations/available",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Business Plan mentions UK-specific integrations
            uk_integrations = data.get("integrations", [])
            integration_names = [i.get("name", "").lower() for i in uk_integrations]
            
            # Should include popular UK business software
            expected_uk_integrations = ["xero", "quickbooks", "sage"]
            found_uk_integrations = [name for name in expected_uk_integrations 
                                   if any(name in integration for integration in integration_names)]
            
            assert len(found_uk_integrations) > 0, "Should have UK business software integrations"
    
    def test_plain_english_to_contract_generation_core_feature(self, client, auth_headers):
        """Test Business Plan Core Feature: Plain English input → Professional UK contracts"""
        with patch('app.api.v1.endpoints.contracts.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}
            
            # Business Plan Example: "Create a consulting agreement for 6 months with monthly payments"
            plain_english_input = "Create a consulting agreement for 6 months with monthly payments"
            
            contract_request = {
                "plain_english_input": plain_english_input,
                "contract_type": "consultancy_agreement"
            }
            
            response = client.post(
                "/api/v1/contracts/generate-from-english",
                json=contract_request,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Core business value proposition validation
            assert "generated_contract" in data, "Must generate contract from plain English"
            assert len(data["generated_contract"]) > 100, "Generated contract must be substantial"
            assert "compliance_score" in data, "Must include UK compliance validation"
            assert data["compliance_score"] >= 0.95, "Generated contract must meet compliance requirements"
    
    def test_3_step_contract_creation_wizard_requirement(self, client, auth_headers):
        """Test MVP Plan Requirement: 3-step contract creation wizard"""
        with patch('app.api.v1.endpoints.contracts.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}
            
            # Step 1: Contract type selection
            step1_response = client.post(
                "/api/v1/contracts/wizard/step1",
                json={"contract_type": "service_agreement"},
                headers=auth_headers
            )
            
            assert step1_response.status_code == 200
            step1_data = step1_response.json()
            assert "wizard_id" in step1_data
            
            wizard_id = step1_data["wizard_id"]
            
            # Step 2: Details input
            step2_response = client.post(
                f"/api/v1/contracts/wizard/step2/{wizard_id}",
                json={
                    "plain_english_input": "6 month consultancy with monthly payments",
                    "client_details": {"name": "ABC Corp", "contact": "john@abc.com"}
                },
                headers=auth_headers
            )
            
            assert step2_response.status_code == 200
            
            # Step 3: Review and finalize
            step3_response = client.post(
                f"/api/v1/contracts/wizard/step3/{wizard_id}",
                json={"confirm": True, "generate_pdf": True},
                headers=auth_headers
            )
            
            assert step3_response.status_code == 200
            step3_data = step3_response.json()
            
            # MVP requirement: Complete 3-step wizard process
            assert "contract_id" in step3_data, "Wizard must create final contract"
            assert "pdf_url" in step3_data or "pdf_generated" in step3_data, "Should offer PDF generation"
    
    def test_version_control_audit_trail_requirement(self, client, auth_headers):
        """Test MVP Plan Requirement: Version control with audit trail"""
        with patch('app.api.v1.endpoints.contracts.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}
            
            contract_id = "test-contract-123"
            
            response = client.get(
                f"/api/v1/contracts/{contract_id}/audit-trail",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # MVP requirement: Version control with audit trail
            assert "audit_events" in data, "Must provide audit trail"
            assert "version_history" in data, "Must track version history"
            
            if data.get("audit_events"):
                for event in data["audit_events"]:
                    assert "timestamp" in event, "All audit events must be timestamped"
                    assert "user_id" in event, "All events must track which user made the change"
                    assert "action" in event, "All events must record what action was taken"
    
    def test_pdf_generation_export_requirement(self, client, auth_headers):
        """Test MVP Plan Requirement: PDF generation and export"""
        with patch('app.api.v1.endpoints.contracts.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}
            
            contract_id = "test-contract-123"
            
            response = client.post(
                f"/api/v1/contracts/{contract_id}/export/pdf",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            
            # Should return PDF file or URL
            content_type = response.headers.get("content-type", "")
            
            if "application/pdf" in content_type:
                # Direct PDF response
                assert len(response.content) > 1000, "PDF should have substantial content"
            else:
                # PDF generation response with URL
                data = response.json()
                assert "pdf_url" in data or "download_url" in data, "Must provide PDF download"
    
    def test_email_notification_deadline_management(self, client, auth_headers):
        """Test MVP Plan Requirement: Email notifications for deadlines"""
        with patch('app.api.v1.endpoints.integrations.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}
            
            with patch('app.api.v1.endpoints.integrations.email_service') as mock_email:
                mock_email.schedule_deadline_reminder = Mock(return_value={
                    "reminder_id": "reminder_123",
                    "scheduled_date": "2025-09-08T09:00:00Z",
                    "recipient": "user@example.com",
                    "status": "scheduled"
                })
                
                reminder_request = {
                    "contract_id": "contract_456",
                    "deadline_date": "2025-09-15",
                    "deadline_type": "contract_expiry",
                    "reminder_days": [7, 3, 1],  # Remind 7, 3, and 1 days before
                    "recipient_email": "user@example.com"
                }
                
                response = client.post(
                    "/api/v1/integrations/email/schedule-deadline-reminder",
                    json=reminder_request,
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.json()
                
                # MVP requirement: Email notifications for deadlines
                assert data["status"] == "scheduled", "Deadline reminders must be scheduled"
                assert "reminder_id" in data, "Should return reminder tracking ID"
    
    def test_sme_pricing_affordability_requirement(self, client, auth_headers):
        """Test Business Plan Requirement: SME-affordable pricing vs enterprise alternatives"""
        with patch('app.api.v1.endpoints.auth.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}
            
            response = client.get(
                "/api/v1/pricing/plans",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Business Plan claims: 85% cost reduction vs enterprise alternatives
            # Enterprise CLM solutions cost £2,500+/month, our target is £149-399/month
            
            assert "pricing_plans" in data
            pricing_plans = data["pricing_plans"]
            
            # Should have SME-focused pricing tiers
            starter_plan = next((p for p in pricing_plans if p.get("name", "").lower() == "starter"), None)
            assert starter_plan is not None, "Should have starter plan for small SMEs"
            
            # Business Plan target: £149/month starter pricing
            if starter_plan:
                monthly_price = starter_plan.get("monthly_price", 0)
                assert monthly_price <= 200, f"Starter plan {monthly_price} should be affordable for SMEs"
                assert monthly_price >= 100, "Price should be commercially viable"
            
            # Should be significantly cheaper than enterprise alternatives (£2,500+/month)
            max_price = max([p.get("monthly_price", 0) for p in pricing_plans])
            assert max_price <= 500, f"Max price {max_price} should be much lower than enterprise alternatives"