"""
Comprehensive End-to-End Analytics and Audit Trail Tests for Pactoria MVP

Tests business analytics, compliance metrics, performance reporting,
audit trail logging, and security monitoring.

Following TDD principles - comprehensive testing for maximum coverage.
"""

import pytest
import uuid
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List
from unittest.mock import patch, AsyncMock, Mock
from decimal import Decimal

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.security import create_access_token
from app.infrastructure.database.models import (
    User, Company, Contract, AuditLog, SystemMetrics, 
    UserRole, ContractStatus, ContractType
)
from tests.conftest import create_test_company, create_test_user


class TestComprehensiveAnalyticsAuditE2E:
    """Comprehensive analytics and audit trail E2E tests"""

    @pytest.fixture
    def authenticated_user(self, db_session: Session):
        """Create authenticated user for tests"""
        company = create_test_company(db_session)
        user = create_test_user(db_session, company.id, role=UserRole.ACCOUNT_OWNER)
        token = create_access_token(data={"sub": user.email})
        headers = {"Authorization": f"Bearer {token}"}
        return user, company, headers

    @pytest.fixture
    def sample_contracts(self, db_session: Session, authenticated_user):
        """Create sample contracts for analytics testing"""
        user, company, headers = authenticated_user
        
        contracts_data = [
            {
                "title": "Service Agreement Alpha",
                "contract_type": ContractType.SERVICE_AGREEMENT,
                "status": ContractStatus.SIGNED,
                "value": Decimal("50000.00"),
                "created_at": datetime.utcnow() - timedelta(days=30),
                "signed_at": datetime.utcnow() - timedelta(days=25)
            },
            {
                "title": "Employment Contract Beta", 
                "contract_type": ContractType.EMPLOYMENT_AGREEMENT,
                "status": ContractStatus.DRAFT,
                "value": Decimal("0.00"),
                "created_at": datetime.utcnow() - timedelta(days=20)
            },
            {
                "title": "Service Agreement Gamma",
                "contract_type": ContractType.SERVICE_AGREEMENT,
                "status": ContractStatus.UNDER_REVIEW,
                "value": Decimal("75000.00"),
                "created_at": datetime.utcnow() - timedelta(days=15)
            },
            {
                "title": "NDA Delta",
                "contract_type": ContractType.NDA,
                "status": ContractStatus.SIGNED,
                "value": Decimal("0.00"),
                "created_at": datetime.utcnow() - timedelta(days=10),
                "signed_at": datetime.utcnow() - timedelta(days=8)
            },
            {
                "title": "Consulting Agreement Epsilon",
                "contract_type": ContractType.CONSULTING_AGREEMENT,
                "status": ContractStatus.EXPIRED,
                "value": Decimal("25000.00"),
                "created_at": datetime.utcnow() - timedelta(days=200),
                "signed_at": datetime.utcnow() - timedelta(days=190),
                "expires_at": datetime.utcnow() - timedelta(days=10)
            }
        ]
        
        created_contracts = []
        for contract_data in contracts_data:
            contract = Contract(
                id=str(uuid.uuid4()),
                company_id=company.id,
                created_by=user.id,
                **contract_data
            )
            db_session.add(contract)
            created_contracts.append(contract)
        
        db_session.commit()
        return created_contracts

    def test_contract_analytics_dashboard(self, client: TestClient, authenticated_user, sample_contracts):
        """Test comprehensive contract analytics dashboard"""
        user, company, headers = authenticated_user
        
        # Get contract analytics
        analytics_response = client.get(
            "/api/v1/analytics/contracts/dashboard",
            params={
                "period": "last_90_days",
                "include_metrics": "all"
            },
            headers=headers
        )
        
        assert analytics_response.status_code == status.HTTP_200_OK
        analytics = analytics_response.json()
        
        # Verify dashboard structure
        assert "overview" in analytics
        assert "contract_metrics" in analytics
        assert "financial_metrics" in analytics
        assert "compliance_metrics" in analytics
        assert "performance_metrics" in analytics
        
        # Verify overview metrics
        overview = analytics["overview"]
        assert "total_contracts" in overview
        assert "active_contracts" in overview
        assert "signed_contracts" in overview
        assert "pending_contracts" in overview
        assert "expired_contracts" in overview
        
        # Verify contract metrics
        contract_metrics = analytics["contract_metrics"]
        assert "contracts_by_type" in contract_metrics
        assert "contracts_by_status" in contract_metrics
        assert "creation_trend" in contract_metrics
        assert "completion_rate" in contract_metrics
        
        # Verify financial metrics
        financial_metrics = analytics["financial_metrics"]
        assert "total_contract_value" in financial_metrics
        assert "signed_contract_value" in financial_metrics
        assert "pending_contract_value" in financial_metrics
        assert "average_contract_value" in financial_metrics
        
        # Verify the data reflects our sample contracts
        assert overview["total_contracts"] >= 5
        assert financial_metrics["total_contract_value"] >= 150000  # Sum of our test contracts

    def test_compliance_scoring_and_analysis(self, client: TestClient, authenticated_user, sample_contracts):
        """Test compliance scoring and analysis features"""
        user, company, headers = authenticated_user
        
        # Get compliance dashboard
        compliance_response = client.get(
            "/api/v1/analytics/compliance/dashboard",
            headers=headers
        )
        
        assert compliance_response.status_code == status.HTTP_200_OK
        compliance_data = compliance_response.json()
        
        # Verify compliance dashboard structure
        assert "overall_score" in compliance_data
        assert "compliance_breakdown" in compliance_data
        assert "risk_assessment" in compliance_data
        assert "recommendations" in compliance_data
        assert "compliance_trends" in compliance_data
        
        # Verify compliance breakdown
        breakdown = compliance_data["compliance_breakdown"]
        expected_categories = [
            "gdpr_compliance",
            "employment_law_compliance",
            "commercial_terms_compliance",
            "consumer_rights_compliance"
        ]
        
        for category in expected_categories:
            assert category in breakdown
            assert "score" in breakdown[category]
            assert "status" in breakdown[category]
        
        # Test detailed compliance report
        report_response = client.get(
            "/api/v1/analytics/compliance/detailed-report",
            params={"include_recommendations": True},
            headers=headers
        )
        
        assert report_response.status_code == status.HTTP_200_OK
        report = report_response.json()
        
        assert "contracts_analyzed" in report
        assert "compliance_issues" in report
        assert "improvement_suggestions" in report
        assert "regulatory_updates" in report

    def test_performance_metrics_and_kpis(self, client: TestClient, authenticated_user, sample_contracts):
        """Test performance metrics and KPI tracking"""
        user, company, headers = authenticated_user
        
        # Get performance KPIs
        kpi_response = client.get(
            "/api/v1/analytics/performance/kpis",
            params={
                "period": "monthly",
                "compare_previous": True
            },
            headers=headers
        )
        
        assert kpi_response.status_code == status.HTTP_200_OK
        kpis = kpi_response.json()
        
        # Verify KPI structure
        assert "current_period" in kpis
        assert "previous_period" in kpis
        assert "performance_indicators" in kpis
        
        # Verify performance indicators
        indicators = kpis["performance_indicators"]
        expected_kpis = [
            "contract_velocity",
            "time_to_signature",
            "approval_cycle_time",
            "contract_success_rate",
            "revenue_pipeline",
            "compliance_score_trend"
        ]
        
        for kpi in expected_kpis:
            assert kpi in indicators
            assert "current_value" in indicators[kpi]
            assert "trend" in indicators[kpi]
            assert "target_value" in indicators[kpi]
        
        # Test team performance metrics
        team_performance_response = client.get(
            "/api/v1/analytics/performance/team",
            headers=headers
        )
        
        assert team_performance_response.status_code == status.HTTP_200_OK
        team_metrics = team_performance_response.json()
        
        assert "team_members" in team_metrics
        assert "productivity_metrics" in team_metrics
        assert "collaboration_metrics" in team_metrics

    def test_financial_analytics_and_reporting(self, client: TestClient, authenticated_user, sample_contracts):
        """Test financial analytics and revenue reporting"""
        user, company, headers = authenticated_user
        
        # Get financial dashboard
        financial_response = client.get(
            "/api/v1/analytics/financial/dashboard",
            params={
                "period": "quarterly",
                "currency": "GBP"
            },
            headers=headers
        )
        
        assert financial_response.status_code == status.HTTP_200_OK
        financial_data = financial_response.json()
        
        # Verify financial dashboard structure
        assert "revenue_metrics" in financial_data
        assert "contract_value_analysis" in financial_data
        assert "revenue_forecast" in financial_data
        assert "payment_analytics" in financial_data
        
        # Verify revenue metrics
        revenue_metrics = financial_data["revenue_metrics"]
        assert "total_revenue" in revenue_metrics
        assert "recurring_revenue" in revenue_metrics
        assert "one_time_revenue" in revenue_metrics
        assert "revenue_growth_rate" in revenue_metrics
        
        # Test revenue forecasting
        forecast_response = client.get(
            "/api/v1/analytics/financial/forecast",
            params={
                "forecast_period": "next_12_months",
                "confidence_level": "80"
            },
            headers=headers
        )
        
        assert forecast_response.status_code == status.HTTP_200_OK
        forecast = forecast_response.json()
        
        assert "forecast_data" in forecast
        assert "confidence_intervals" in forecast
        assert "assumptions" in forecast
        assert "scenario_analysis" in forecast

    def test_audit_trail_comprehensive_logging(self, client: TestClient, db_session: Session, authenticated_user):
        """Test comprehensive audit trail logging across all operations"""
        user, company, headers = authenticated_user
        
        # Perform various operations that should generate audit logs
        operations = [
            # Create contract
            {
                "method": "POST",
                "url": "/api/v1/contracts/",
                "data": {
                    "title": "Audit Test Contract",
                    "contract_type": "service_agreement",
                    "content": "Contract content for audit testing"
                }
            },
            # Update user profile
            {
                "method": "PUT", 
                "url": "/api/v1/auth/profile",
                "data": {
                    "full_name": "Updated Name for Audit",
                    "department": "Updated Department"
                }
            }
        ]
        
        operation_results = []
        for operation in operations:
            if operation["method"] == "POST":
                response = client.post(operation["url"], json=operation["data"], headers=headers)
            elif operation["method"] == "PUT":
                response = client.put(operation["url"], json=operation["data"], headers=headers)
            
            operation_results.append({
                "operation": operation,
                "response": response.json() if response.status_code < 400 else None,
                "status_code": response.status_code
            })
        
        # Wait a moment for audit logs to be processed
        import time
        time.sleep(0.1)
        
        # Retrieve audit logs
        audit_response = client.get(
            "/api/v1/audit/logs",
            params={
                "start_date": (datetime.utcnow() - timedelta(minutes=5)).isoformat(),
                "end_date": datetime.utcnow().isoformat(),
                "limit": 50
            },
            headers=headers
        )
        
        assert audit_response.status_code == status.HTTP_200_OK
        audit_logs = audit_response.json()["items"]
        
        # Verify audit logs were created
        assert len(audit_logs) >= 2
        
        # Verify audit log structure
        for log in audit_logs:
            assert "id" in log
            assert "user_id" in log
            assert "company_id" in log  
            assert "action" in log
            assert "resource_type" in log
            assert "timestamp" in log
            assert "ip_address" in log
            assert "user_agent" in log
            assert "details" in log
        
        # Verify specific audit events
        contract_creation_logs = [
            log for log in audit_logs 
            if log["action"] == "contract_created" and log["resource_type"] == "contract"
        ]
        assert len(contract_creation_logs) >= 1
        
        profile_update_logs = [
            log for log in audit_logs
            if log["action"] == "profile_updated" and log["resource_type"] == "user"
        ]
        assert len(profile_update_logs) >= 1

    def test_security_event_monitoring(self, client: TestClient, db_session: Session, authenticated_user):
        """Test security event monitoring and threat detection"""
        user, company, headers = authenticated_user
        
        # Simulate various security-related events
        
        # 1. Failed login attempts
        invalid_credentials = {
            "email": user.email,
            "password": "wrong_password"
        }
        
        for _ in range(5):  # Multiple failed attempts
            client.post("/api/v1/auth/login", json=invalid_credentials)
        
        # 2. Suspicious access patterns (if implemented)
        suspicious_headers = {
            "Authorization": f"Bearer {create_access_token(data={'sub': user.email})}",
            "User-Agent": "Suspicious-Bot/1.0",
            "X-Forwarded-For": "192.168.1.100"
        }
        
        client.get("/api/v1/contracts/", headers=suspicious_headers)
        
        # 3. Unauthorized access attempts
        unauthorized_headers = {"Authorization": "Bearer invalid_token"}
        client.get("/api/v1/contracts/", headers=unauthorized_headers)
        
        # Get security events
        security_response = client.get(
            "/api/v1/audit/security-events",
            params={
                "start_date": (datetime.utcnow() - timedelta(minutes=5)).isoformat(),
                "severity": "high,medium",
                "limit": 50
            },
            headers=headers
        )
        
        assert security_response.status_code == status.HTTP_200_OK
        security_events = security_response.json()["items"]
        
        # Verify security events structure
        for event in security_events:
            assert "event_type" in event
            assert "severity" in event
            assert "timestamp" in event
            assert "source_ip" in event
            assert "user_id" in event or event["event_type"] in ["failed_login", "unauthorized_access"]
            assert "details" in event
        
        # Test security dashboard
        security_dashboard_response = client.get(
            "/api/v1/analytics/security/dashboard",
            headers=headers
        )
        
        assert security_dashboard_response.status_code == status.HTTP_200_OK
        security_dashboard = security_dashboard_response.json()
        
        assert "threat_summary" in security_dashboard
        assert "recent_incidents" in security_dashboard
        assert "security_score" in security_dashboard
        assert "vulnerability_assessment" in security_dashboard

    def test_audit_log_search_and_filtering(self, client: TestClient, db_session: Session, authenticated_user):
        """Test audit log search and advanced filtering capabilities"""
        user, company, headers = authenticated_user
        
        # Create some audit-generating activities with different types
        test_activities = [
            {
                "action": "create_contract",
                "url": "/api/v1/contracts/",
                "data": {"title": "Search Test Contract 1", "contract_type": "service_agreement"}
            },
            {
                "action": "update_profile", 
                "url": "/api/v1/auth/profile",
                "data": {"department": "Legal Department"}
            },
            {
                "action": "create_contract",
                "url": "/api/v1/contracts/",
                "data": {"title": "Search Test Contract 2", "contract_type": "nda"}
            }
        ]
        
        for activity in test_activities:
            if "create_contract" in activity["action"]:
                client.post(activity["url"], json=activity["data"], headers=headers)
            elif "update_profile" in activity["action"]:
                client.put(activity["url"], json=activity["data"], headers=headers)
        
        # Test filtering by action type
        contract_logs_response = client.get(
            "/api/v1/audit/logs",
            params={
                "action": "contract_created",
                "start_date": (datetime.utcnow() - timedelta(minutes=5)).isoformat()
            },
            headers=headers
        )
        
        assert contract_logs_response.status_code == status.HTTP_200_OK
        contract_logs = contract_logs_response.json()["items"]
        assert all(log["action"] == "contract_created" for log in contract_logs)
        
        # Test filtering by resource type
        user_logs_response = client.get(
            "/api/v1/audit/logs",
            params={
                "resource_type": "user",
                "start_date": (datetime.utcnow() - timedelta(minutes=5)).isoformat()
            },
            headers=headers
        )
        
        assert user_logs_response.status_code == status.HTTP_200_OK
        user_logs = user_logs_response.json()["items"]
        assert all(log["resource_type"] == "user" for log in user_logs)
        
        # Test date range filtering
        date_filtered_response = client.get(
            "/api/v1/audit/logs",
            params={
                "start_date": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
                "end_date": datetime.utcnow().isoformat()
            },
            headers=headers
        )
        
        assert date_filtered_response.status_code == status.HTTP_200_OK
        date_filtered_logs = date_filtered_response.json()["items"]
        
        # Verify all logs are within the specified date range
        for log in date_filtered_logs:
            log_time = datetime.fromisoformat(log["timestamp"].replace('Z', '+00:00'))
            assert log_time >= datetime.utcnow() - timedelta(hours=1)

    def test_data_export_and_reporting(self, client: TestClient, authenticated_user, sample_contracts):
        """Test comprehensive data export and reporting functionality"""
        user, company, headers = authenticated_user
        
        # Test analytics data export
        export_params = {
            "report_type": "comprehensive_analytics",
            "format": "json",
            "start_date": (datetime.utcnow() - timedelta(days=90)).isoformat(),
            "end_date": datetime.utcnow().isoformat(),
            "include_sections": "contracts,compliance,financial,performance"
        }
        
        export_response = client.post(
            "/api/v1/analytics/export",
            json=export_params,
            headers=headers
        )
        
        assert export_response.status_code == status.HTTP_200_OK
        export_result = export_response.json()
        
        assert "export_id" in export_result
        assert "download_url" in export_result
        assert "expires_at" in export_result
        assert "estimated_size" in export_result
        
        # Test audit log export
        audit_export_params = {
            "report_type": "audit_trail",
            "format": "csv", 
            "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "end_date": datetime.utcnow().isoformat(),
            "filters": {
                "actions": ["contract_created", "contract_updated", "contract_signed"],
                "severity": ["medium", "high"]
            }
        }
        
        audit_export_response = client.post(
            "/api/v1/audit/export",
            json=audit_export_params,
            headers=headers
        )
        
        assert audit_export_response.status_code == status.HTTP_200_OK
        audit_export_result = audit_export_response.json()
        
        assert "export_id" in audit_export_result
        assert "download_url" in audit_export_result
        
        # Test scheduled reporting
        scheduled_report_data = {
            "name": "Monthly Analytics Report",
            "report_type": "analytics_dashboard",
            "schedule": "monthly",
            "day_of_month": 1,
            "time": "09:00",
            "recipients": [user.email],
            "format": "pdf",
            "sections": ["overview", "compliance", "financial"]
        }
        
        scheduled_report_response = client.post(
            "/api/v1/analytics/scheduled-reports",
            json=scheduled_report_data,
            headers=headers
        )
        
        assert scheduled_report_response.status_code == status.HTTP_201_CREATED
        scheduled_report = scheduled_report_response.json()
        
        assert scheduled_report["name"] == "Monthly Analytics Report"
        assert scheduled_report["schedule"] == "monthly"
        assert "id" in scheduled_report

    def test_real_time_metrics_and_monitoring(self, client: TestClient, authenticated_user):
        """Test real-time metrics updates and system monitoring"""
        user, company, headers = authenticated_user
        
        # Get real-time dashboard metrics
        realtime_response = client.get(
            "/api/v1/analytics/realtime/metrics",
            headers=headers
        )
        
        assert realtime_response.status_code == status.HTTP_200_OK
        realtime_metrics = realtime_response.json()
        
        # Verify real-time metrics structure
        assert "current_active_users" in realtime_metrics
        assert "system_performance" in realtime_metrics  
        assert "recent_activities" in realtime_metrics
        assert "alert_status" in realtime_metrics
        
        # Verify system performance metrics
        performance = realtime_metrics["system_performance"]
        assert "response_time_avg" in performance
        assert "database_performance" in performance
        assert "api_health_status" in performance
        assert "integration_status" in performance
        
        # Test system health monitoring
        health_response = client.get(
            "/api/v1/analytics/system/health",
            headers=headers
        )
        
        assert health_response.status_code == status.HTTP_200_OK
        health_data = health_response.json()
        
        assert "overall_status" in health_data
        assert "component_status" in health_data
        assert "performance_indicators" in health_data
        assert "resource_usage" in health_data
        
        # Verify component status
        components = health_data["component_status"]
        expected_components = ["database", "ai_service", "email_service", "file_storage", "cache"]
        
        for component in expected_components:
            if component in components:
                assert "status" in components[component]
                assert "response_time" in components[component]
                assert "last_check" in components[component]

    def test_compliance_audit_trail(self, client: TestClient, db_session: Session, authenticated_user, sample_contracts):
        """Test compliance-specific audit trail and regulatory reporting"""
        user, company, headers = authenticated_user
        
        # Perform compliance-related activities
        compliance_activities = [
            # Compliance analysis request
            {"action": "analyze_contract", "contract_id": sample_contracts[0].id},
            # Compliance report generation  
            {"action": "generate_compliance_report", "report_type": "gdpr"},
            # Data retention policy update
            {"action": "update_retention_policy", "policy_type": "contract_data"}
        ]
        
        for activity in compliance_activities:
            if activity["action"] == "analyze_contract":
                client.post(f"/api/v1/contracts/{activity['contract_id']}/analyze", headers=headers)
            elif activity["action"] == "generate_compliance_report":
                client.post(f"/api/v1/analytics/compliance/reports", 
                           json={"report_type": activity["report_type"]}, headers=headers)
        
        # Get compliance audit trail
        compliance_audit_response = client.get(
            "/api/v1/audit/compliance-trail",
            params={
                "start_date": (datetime.utcnow() - timedelta(minutes=5)).isoformat(),
                "compliance_categories": "gdpr,employment_law,consumer_rights"
            },
            headers=headers
        )
        
        assert compliance_audit_response.status_code == status.HTTP_200_OK
        compliance_logs = compliance_audit_response.json()["items"]
        
        # Verify compliance audit logs
        for log in compliance_logs:
            assert "compliance_category" in log
            assert "regulatory_impact" in log
            assert "data_sensitivity" in log
            assert "retention_period" in log
        
        # Test regulatory compliance report
        regulatory_report_response = client.get(
            "/api/v1/analytics/compliance/regulatory-report",
            params={
                "regulation": "gdpr",
                "period": "quarterly"
            },
            headers=headers
        )
        
        assert regulatory_report_response.status_code == status.HTTP_200_OK
        regulatory_report = regulatory_report_response.json()
        
        assert "compliance_summary" in regulatory_report
        assert "violations" in regulatory_report
        assert "remediation_actions" in regulatory_report
        assert "certification_status" in regulatory_report