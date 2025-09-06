"""
Integration tests for Business Analytics API endpoints
Testing MVP requirements for time savings, customer satisfaction, and business metrics
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock
from datetime import datetime, timedelta

from app.main import app


class TestBusinessAnalyticsAPI:
    """Integration tests for business analytics endpoints"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    @pytest.fixture
    def auth_headers(self):
        """Mock authentication headers"""
        return {"Authorization": "Bearer mock_jwt_token"}

    def test_get_time_savings_metrics(self, client, auth_headers):
        """Test MVP requirement: 6+ hours/week time savings measurement"""
        with patch("app.api.v1.endpoints.analytics.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            with patch(
                "app.api.v1.endpoints.analytics.analytics_service"
            ) as mock_analytics:
                mock_analytics.calculate_time_savings = Mock(
                    return_value={
                        "company_id": "company-456",
                        "period": "weekly",
                        "total_contracts_processed": 25,
                        "average_time_per_contract": {
                            "before_pactoria": 180,  # 3 hours in minutes
                            "with_pactoria": 45,  # 45 minutes
                            "time_saved_per_contract": 135,  # 2.25 hours saved
                        },
                        "total_time_saved_hours": 56.25,  # Exceeds MVP requirement of 6+ hours
                        "average_weekly_savings": 8.5,  # Per user
                        "efficiency_improvement": 75,  # 75% improvement
                        "contracts_generated_count": 25,
                        "contracts_manually_created_count": 0,
                    }
                )

                response = client.get(
                    "/api/v1/analytics/time-savings",
                    params={"period": "weekly"},
                    headers=auth_headers,
                )

                assert response.status_code == 200
                data = response.json()

                # Verify MVP requirement: 6+ hours/week savings
                assert data["total_time_saved_hours"] >= 6.0
                assert data["average_weekly_savings"] >= 6.0

                # Verify detailed metrics
                assert data["efficiency_improvement"] >= 50  # Significant improvement
                assert data["contracts_generated_count"] > 0
                assert "time_saved_per_contract" in data["average_time_per_contract"]

    def test_get_customer_satisfaction_metrics(self, client, auth_headers):
        """Test MVP requirement: 4.5+ customer satisfaction rating"""
        with patch("app.api.v1.endpoints.analytics.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            with patch(
                "app.api.v1.endpoints.analytics.analytics_service"
            ) as mock_analytics:
                mock_analytics.get_satisfaction_metrics = Mock(
                    return_value={
                        "company_id": "company-456",
                        "overall_satisfaction_rating": 4.7,  # Exceeds MVP requirement of 4.5+
                        "total_reviews": 45,
                        "rating_distribution": {
                            "5_stars": 28,
                            "4_stars": 12,
                            "3_stars": 4,
                            "2_stars": 1,
                            "1_stars": 0,
                        },
                        "satisfaction_categories": {
                            "ease_of_use": 4.8,
                            "contract_quality": 4.6,
                            "time_savings": 4.9,
                            "uk_compliance": 4.5,
                            "customer_support": 4.4,
                        },
                        "nps_score": 68,  # Net Promoter Score
                        "retention_rate": 0.92,  # 92% retention
                        "referral_willingness": 0.84,  # 84% willing to refer
                    }
                )

                response = client.get(
                    "/api/v1/analytics/customer-satisfaction", headers=auth_headers
                )

                assert response.status_code == 200
                data = response.json()

                # Verify MVP requirement: 4.5+ customer satisfaction
                assert data["overall_satisfaction_rating"] >= 4.5

                # Verify detailed satisfaction metrics
                assert data["total_reviews"] > 0
                assert data["retention_rate"] >= 0.90  # MVP requirement: >90%
                assert data["referral_willingness"] >= 0.80  # MVP requirement: >80%
                assert data["nps_score"] > 50  # Good NPS score

    def test_get_mvp_success_metrics(self, client, auth_headers):
        """Test all MVP success criteria in one endpoint"""
        with patch("app.api.v1.endpoints.analytics.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            with patch(
                "app.api.v1.endpoints.analytics.analytics_service"
            ) as mock_analytics:
                mock_analytics.get_mvp_metrics = Mock(
                    return_value={
                        "mvp_validation_status": "SUCCESS",
                        "pilot_customers": {
                            "total_active": 15,  # Exceeds MVP requirement of 12
                            "target": 12,
                            "status": "EXCEEDED",
                        },
                        "time_savings": {
                            "average_hours_per_week": 7.5,  # Exceeds MVP requirement of 6+
                            "target": 6.0,
                            "status": "EXCEEDED",
                        },
                        "customer_satisfaction": {
                            "current_rating": 4.6,  # Exceeds MVP requirement of 4.5+
                            "target": 4.5,
                            "status": "EXCEEDED",
                        },
                        "letters_of_intent": {
                            "total_signed": 12,  # Exceeds MVP requirement of 8+
                            "target": 8,
                            "status": "EXCEEDED",
                        },
                        "uk_compliance_accuracy": {
                            "current_accuracy": 0.97,  # Exceeds MVP requirement of 95%
                            "target": 0.95,
                            "status": "EXCEEDED",
                        },
                        "revenue_commitments": {
                            "annual_value_gbp": 18500,  # Exceeds MVP target of £15,000+
                            "target": 15000,
                            "status": "EXCEEDED",
                        },
                    }
                )

                response = client.get(
                    "/api/v1/analytics/mvp-success-metrics", headers=auth_headers
                )

                assert response.status_code == 200
                data = response.json()

                # Verify all MVP success criteria are met
                assert data["mvp_validation_status"] == "SUCCESS"
                assert data["pilot_customers"]["total_active"] >= 12
                assert data["time_savings"]["average_hours_per_week"] >= 6.0
                assert data["customer_satisfaction"]["current_rating"] >= 4.5
                assert data["letters_of_intent"]["total_signed"] >= 8
                assert data["uk_compliance_accuracy"]["current_accuracy"] >= 0.95
                assert data["revenue_commitments"]["annual_value_gbp"] >= 15000

    def test_get_contract_generation_analytics(self, client, auth_headers):
        """Test contract generation performance analytics"""
        with patch("app.api.v1.endpoints.analytics.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            response = client.get(
                "/api/v1/analytics/contract-generation",
                params={"period": "monthly"},
                headers=auth_headers,
            )

            assert response.status_code == 200
            data = response.json()

            # Verify performance metrics
            assert "total_contracts_generated" in data
            assert "success_rate" in data
            assert "average_generation_time" in data
            assert "contract_types_breakdown" in data
            assert "quality_metrics" in data

            # Verify MVP performance requirements
            if "average_generation_time" in data:
                assert data["average_generation_time"] <= 30  # MVP: <30 seconds
            if "success_rate" in data:
                assert data["success_rate"] >= 0.90  # High success rate

    def test_get_compliance_analytics(self, client, auth_headers):
        """Test compliance accuracy analytics"""
        with patch("app.api.v1.endpoints.analytics.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            response = client.get("/api/v1/analytics/compliance", headers=auth_headers)

            assert response.status_code == 200
            data = response.json()

            # Verify compliance metrics structure
            assert "overall_compliance_score" in data
            assert "gdpr_compliance" in data
            assert "employment_law_compliance" in data
            assert "consumer_rights_compliance" in data
            assert "compliance_trends" in data

            # Verify MVP requirement: 95%+ accuracy
            assert data["overall_compliance_score"] >= 0.95

    def test_get_usage_analytics(self, client, auth_headers):
        """Test user engagement and usage analytics"""
        with patch("app.api.v1.endpoints.analytics.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            response = client.get(
                "/api/v1/analytics/usage",
                params={"period": "monthly"},
                headers=auth_headers,
            )

            assert response.status_code == 200
            data = response.json()

            # Verify usage metrics
            assert "active_users" in data
            assert "contracts_per_user" in data
            assert "feature_usage" in data
            assert "session_analytics" in data

            # Verify user limits (MVP: 5 users per account)
            if "active_users" in data:
                assert data["active_users"] <= 5  # MVP limit

    def test_analytics_with_date_range(self, client, auth_headers):
        """Test analytics endpoints with date range filtering"""
        with patch("app.api.v1.endpoints.analytics.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            start_date = (datetime.now() - timedelta(days=30)).isoformat()
            end_date = datetime.now().isoformat()

            response = client.get(
                "/api/v1/analytics/time-savings",
                params={"start_date": start_date, "end_date": end_date},
                headers=auth_headers,
            )

            assert response.status_code == 200
            data = response.json()

            # Verify date range is respected
            assert "period_start" in data or "start_date" in data
            assert "period_end" in data or "end_date" in data

    def test_analytics_unauthorized_access(self, client):
        """Test that analytics endpoints require authentication"""
        analytics_endpoints = [
            "/api/v1/analytics/time-savings",
            "/api/v1/analytics/customer-satisfaction",
            "/api/v1/analytics/mvp-success-metrics",
            "/api/v1/analytics/contract-generation",
            "/api/v1/analytics/compliance",
            "/api/v1/analytics/usage",
        ]

        for endpoint in analytics_endpoints:
            response = client.get(endpoint)
            assert response.status_code in [401, 422]  # Unauthorized

    def test_analytics_different_company_isolation(self, client, auth_headers):
        """Test that companies can only see their own analytics"""
        with patch("app.api.v1.endpoints.analytics.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            with patch(
                "app.api.v1.endpoints.analytics.analytics_service"
            ) as mock_analytics:
                mock_analytics.get_mvp_metrics = Mock(
                    return_value={
                        "company_id": "company-456",  # Same as user's company
                        "mvp_validation_status": "SUCCESS",
                    }
                )

                response = client.get(
                    "/api/v1/analytics/mvp-success-metrics", headers=auth_headers
                )

                assert response.status_code == 200
                data = response.json()
                assert data["company_id"] == "company-456"

    def test_analytics_performance_requirements(self, client, auth_headers):
        """Test that analytics endpoints meet performance requirements"""
        import time

        with patch("app.api.v1.endpoints.analytics.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            start_time = time.time()

            response = client.get(
                "/api/v1/analytics/mvp-success-metrics", headers=auth_headers
            )

            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds

            assert response.status_code == 200
            # MVP requirement: API response time <500ms
            assert (
                response_time < 500
            ), f"Response time {response_time}ms exceeds 500ms limit"

    @pytest.mark.parametrize("period", ["daily", "weekly", "monthly", "yearly"])
    def test_analytics_time_periods(self, client, auth_headers, period):
        """Test analytics with different time periods"""
        with patch("app.api.v1.endpoints.analytics.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            response = client.get(
                "/api/v1/analytics/time-savings",
                params={"period": period},
                headers=auth_headers,
            )

            assert response.status_code == 200
            data = response.json()
            assert "period" in data
            assert data["period"] == period
