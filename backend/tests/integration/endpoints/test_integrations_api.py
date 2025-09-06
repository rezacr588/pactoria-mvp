"""
Integration tests for External Integrations API endpoints
Testing MVP requirements for calendar integration, email notifications, and CSV export
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock, AsyncMock
from datetime import datetime, timedelta
import json
import csv
import io

from app.main import app


class TestIntegrationsAPI:
    """Integration tests for external integrations endpoints"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    @pytest.fixture
    def auth_headers(self):
        """Mock authentication headers"""
        return {"Authorization": "Bearer mock_jwt_token"}

    def test_calendar_integration_setup(self, client, auth_headers):
        """Test MVP requirement: Calendar integration setup"""
        with patch("app.api.v1.endpoints.integrations.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            calendar_config = {
                "provider": "google_calendar",
                "account_email": "user@example.com",
                "sync_contract_deadlines": True,
                "reminder_days_before": [7, 3, 1],
                "calendar_name": "Pactoria Contract Deadlines",
            }

            response = client.post(
                "/api/v1/integrations/calendar/setup",
                json=calendar_config,
                headers=auth_headers,
            )

            assert response.status_code == 200
            data = response.json()

            # Verify calendar integration setup
            assert "integration_id" in data
            assert "status" in data
            assert "provider" in data
            assert data["provider"] == "google_calendar"
            assert data["status"] == "active"

    def test_calendar_event_creation(self, client, auth_headers):
        """Test automatic calendar event creation for contract deadlines"""
        with patch("app.api.v1.endpoints.integrations.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            with patch(
                "app.api.v1.endpoints.integrations.calendar_service"
            ) as mock_calendar:
                mock_calendar.create_contract_deadline_event = AsyncMock(
                    return_value={
                        "event_id": "cal_event_123",
                        "calendar_id": "primary",
                        "contract_id": "contract_456",
                        "event_title": "Contract Deadline: Service Agreement with ABC Corp",
                        "event_date": "2025-09-15T09:00:00Z",
                        "reminder_set": True,
                        "attendees": ["user@example.com"],
                        "status": "confirmed",
                    }
                )

                event_request = {
                    "contract_id": "contract_456",
                    "deadline_date": "2025-09-15",
                    "deadline_type": "contract_expiry",
                    "title": "Service Agreement with ABC Corp",
                    "description": "Contract expiry deadline for Service Agreement",
                    "send_reminders": True,
                }

                response = client.post(
                    "/api/v1/integrations/calendar/create-event",
                    json=event_request,
                    headers=auth_headers,
                )

                assert response.status_code == 200
                data = response.json()

                # Verify calendar event creation
                assert data["event_id"] == "cal_event_123"
                assert data["contract_id"] == "contract_456"
                assert data["reminder_set"] is True
                assert data["status"] == "confirmed"

    def test_email_notification_setup(self, client, auth_headers):
        """Test MVP requirement: Email notifications setup"""
        with patch("app.api.v1.endpoints.integrations.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            email_config = {
                "notification_types": [
                    "contract_generated",
                    "deadline_reminder",
                    "compliance_alert",
                    "contract_signed",
                ],
                "email_address": "user@example.com",
                "frequency": "immediate",
                "digest_enabled": False,
            }

            response = client.post(
                "/api/v1/integrations/email/setup",
                json=email_config,
                headers=auth_headers,
            )

            assert response.status_code == 200
            data = response.json()

            # Verify email integration setup
            assert "integration_id" in data
            assert "status" in data
            assert "notification_types" in data
            assert data["status"] == "active"
            assert "contract_generated" in data["notification_types"]

    def test_send_contract_deadline_email(self, client, auth_headers):
        """Test sending email notifications for contract deadlines"""
        with patch("app.api.v1.endpoints.integrations.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            with patch("app.api.v1.endpoints.integrations.email_service") as mock_email:
                mock_email.send_deadline_reminder = AsyncMock(
                    return_value={
                        "message_id": "email_msg_123",
                        "status": "sent",
                        "recipient": "user@example.com",
                        "subject": "Contract Deadline Reminder: Service Agreement",
                        "sent_at": "2025-08-30T10:00:00Z",
                    }
                )

                email_request = {
                    "contract_id": "contract_456",
                    "deadline_date": "2025-09-15",
                    "deadline_type": "contract_expiry",
                    "recipient_email": "user@example.com",
                    "days_until_deadline": 7,
                    "contract_title": "Service Agreement with ABC Corp",
                }

                response = client.post(
                    "/api/v1/integrations/email/send-deadline-reminder",
                    json=email_request,
                    headers=auth_headers,
                )

                assert response.status_code == 200
                data = response.json()

                # Verify email sending
                assert data["message_id"] == "email_msg_123"
                assert data["status"] == "sent"
                assert data["recipient"] == "user@example.com"

    def test_csv_export_contracts(self, client, auth_headers):
        """Test MVP requirement: CSV export for record keeping"""
        with patch("app.api.v1.endpoints.integrations.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            with patch(
                "app.api.v1.endpoints.integrations.export_service"
            ) as mock_export:
                mock_export.export_contracts_csv = Mock(
                    return_value={
                        "file_url": "/api/v1/exports/contracts_2025_08_30.csv",
                        "file_name": "contracts_2025_08_30.csv",
                        "total_records": 25,
                        "export_date": "2025-08-30T10:00:00Z",
                        "columns": [
                            "contract_id",
                            "title",
                            "type",
                            "status",
                            "created_date",
                            "compliance_score",
                            "risk_score",
                            "client_name",
                        ],
                    }
                )

                export_request = {
                    "export_type": "contracts",
                    "date_range": {
                        "start_date": "2025-08-01",
                        "end_date": "2025-08-30",
                    },
                    "include_columns": [
                        "contract_id",
                        "title",
                        "type",
                        "status",
                        "created_date",
                        "compliance_score",
                        "risk_score",
                        "client_name",
                    ],
                    "filter_by_status": ["active", "completed"],
                }

                response = client.post(
                    "/api/v1/integrations/export/csv",
                    json=export_request,
                    headers=auth_headers,
                )

                assert response.status_code == 200
                data = response.json()

                # Verify CSV export
                assert data["file_name"] == "contracts_2025_08_30.csv"
                assert data["total_records"] == 25
                assert len(data["columns"]) > 0

    def test_download_csv_export(self, client, auth_headers):
        """Test downloading the generated CSV export file"""
        with patch("app.api.v1.endpoints.integrations.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            # Mock CSV content
            csv_content = """contract_id,title,type,status,created_date,compliance_score,risk_score,client_name
contract_123,Service Agreement,service_agreement,active,2025-08-15,0.95,3,ABC Corp
contract_124,Employment Contract,employment_contract,active,2025-08-20,0.97,2,XYZ Ltd"""

            with patch("app.api.v1.endpoints.integrations.file_service") as mock_file:
                mock_file.get_export_file = Mock(return_value=csv_content)

                response = client.get(
                    "/api/v1/integrations/export/download/contracts_2025_08_30.csv",
                    headers=auth_headers,
                )

                assert response.status_code == 200
                assert response.headers["content-type"] == "text/csv"
                assert "attachment" in response.headers["content-disposition"]

                # Verify CSV content
                csv_reader = csv.reader(io.StringIO(response.text))
                rows = list(csv_reader)
                assert len(rows) >= 2  # Header + at least one data row
                assert rows[0][0] == "contract_id"  # Header verification

    def test_webhook_configuration(self, client, auth_headers):
        """Test webhook configuration for external integrations"""
        with patch("app.api.v1.endpoints.integrations.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            webhook_config = {
                "url": "https://external-system.com/pactoria-webhook",
                "events": [
                    "contract.generated",
                    "contract.signed",
                    "compliance.validated",
                    "deadline.approaching",
                ],
                "secret": "webhook_secret_123",
                "active": True,
            }

            response = client.post(
                "/api/v1/integrations/webhooks/create",
                json=webhook_config,
                headers=auth_headers,
            )

            assert response.status_code == 200
            data = response.json()

            # Verify webhook configuration
            assert "webhook_id" in data
            assert "status" in data
            assert data["status"] == "active"
            assert len(data["events"]) == 4

    def test_webhook_delivery_test(self, client, auth_headers):
        """Test webhook delivery with test payload"""
        with patch("app.api.v1.endpoints.integrations.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            with patch(
                "app.api.v1.endpoints.integrations.webhook_service"
            ) as mock_webhook:
                mock_webhook.send_test_webhook = AsyncMock(
                    return_value={
                        "delivery_id": "delivery_123",
                        "status": "success",
                        "response_code": 200,
                        "response_time_ms": 150,
                        "webhook_url": "https://external-system.com/pactoria-webhook",
                        "payload_sent": True,
                    }
                )

                test_request = {
                    "webhook_id": "webhook_456",
                    "event_type": "contract.generated",
                    "test_payload": {
                        "event": "contract.generated",
                        "contract_id": "contract_test_123",
                        "timestamp": "2025-08-30T10:00:00Z",
                    },
                }

                response = client.post(
                    "/api/v1/integrations/webhooks/test",
                    json=test_request,
                    headers=auth_headers,
                )

                assert response.status_code == 200
                data = response.json()

                # Verify webhook test delivery
                assert data["status"] == "success"
                assert data["response_code"] == 200
                assert data["response_time_ms"] <= 1000  # Good response time

    def test_integration_status_monitoring(self, client, auth_headers):
        """Test monitoring status of all integrations"""
        with patch("app.api.v1.endpoints.integrations.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            response = client.get("/api/v1/integrations/status", headers=auth_headers)

            assert response.status_code == 200
            data = response.json()

            # Integration status structure
            assert "integrations" in data
            assert "overall_health" in data

            integrations = data["integrations"]

            # Verify each integration type has status
            for integration_name, integration_data in integrations.items():
                assert "status" in integration_data
                assert "last_activity" in integration_data
                assert integration_data["status"] in ["active", "inactive", "error"]

    def test_email_template_customization(self, client, auth_headers):
        """Test customization of email notification templates"""
        with patch("app.api.v1.endpoints.integrations.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            template_config = {
                "template_type": "deadline_reminder",
                "subject": "Important: Contract deadline approaching for {{contract_title}}",
                "body_html": """
                <p>Dear {{recipient_name}},</p>
                <p>This is a reminder that your contract "{{contract_title}}" has a deadline approaching on {{deadline_date}}.</p>
                <p>Please review the contract and take necessary actions.</p>
                <p>Best regards,<br>Pactoria Team</p>
                """,
                "variables": ["recipient_name", "contract_title", "deadline_date"],
                "active": True,
            }

            response = client.post(
                "/api/v1/integrations/email/templates",
                json=template_config,
                headers=auth_headers,
            )

            assert response.status_code == 200
            data = response.json()

            # Verify template creation
            assert "template_id" in data
            assert data["template_type"] == "deadline_reminder"
            assert data["active"] is True

    def test_export_different_formats(self, client, auth_headers):
        """Test exporting data in different formats"""
        with patch("app.api.v1.endpoints.integrations.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            export_formats = ["csv", "xlsx", "json"]

            for format_type in export_formats:
                export_request = {
                    "export_type": "contracts",
                    "format": format_type,
                    "date_range": {
                        "start_date": "2025-08-01",
                        "end_date": "2025-08-30",
                    },
                }

                response = client.post(
                    f"/api/v1/integrations/export/{format_type}",
                    json=export_request,
                    headers=auth_headers,
                )

                assert response.status_code == 200
                data = response.json()
                assert "file_name" in data
                assert format_type in data["file_name"]

    def test_integration_authentication_required(self, client):
        """Test that integration endpoints require authentication"""
        integration_endpoints = [
            "/api/v1/integrations/calendar/setup",
            "/api/v1/integrations/email/setup",
            "/api/v1/integrations/export/csv",
            "/api/v1/integrations/webhooks/create",
            "/api/v1/integrations/status",
        ]

        for endpoint in integration_endpoints:
            if "setup" in endpoint or "create" in endpoint or "csv" in endpoint:
                response = client.post(endpoint, json={})
            else:
                response = client.get(endpoint)

            assert response.status_code in [401, 422]  # Unauthorized

    def test_integration_rate_limiting(self, client, auth_headers):
        """Test rate limiting on integration endpoints"""
        with patch("app.api.v1.endpoints.integrations.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            # Make multiple rapid requests to test rate limiting
            responses = []
            for i in range(10):
                response = client.get(
                    "/api/v1/integrations/status", headers=auth_headers
                )
                responses.append(response.status_code)

            # Most requests should succeed, but rate limiting might kick in
            success_count = sum(1 for status in responses if status == 200)
            assert success_count >= 5  # At least some requests should succeed

    @pytest.mark.parametrize("integration_type", ["calendar", "email", "webhooks"])
    def test_integration_error_handling(self, client, auth_headers, integration_type):
        """Test error handling for different integration types"""
        with patch("app.api.v1.endpoints.integrations.get_current_user") as mock_user:
            mock_user.return_value = {"id": "user-123", "company_id": "company-456"}

            # Test with invalid configuration
            invalid_config = {"invalid_field": "invalid_value"}

            response = client.post(
                f"/api/v1/integrations/{integration_type}/setup",
                json=invalid_config,
                headers=auth_headers,
            )

            # Should handle errors gracefully
            assert response.status_code in [400, 422]  # Bad request or validation error

            if response.status_code == 400:
                error_data = response.json()
                assert "detail" in error_data or "error" in error_data
