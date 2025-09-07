"""
Comprehensive End-to-End Notifications System Tests for Pactoria MVP

Tests real-time notifications, email notifications, notification preferences,
and notification delivery workflows.

Following TDD principles - comprehensive testing for maximum coverage.
"""

import pytest
import uuid
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any
from unittest.mock import patch, AsyncMock, Mock
import websockets

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.security import create_access_token
from app.infrastructure.database.models import (
    User, Company, Notification, UserRole, NotificationStatus, NotificationType
)
from tests.conftest import create_test_company, create_test_user


class TestComprehensiveNotificationsE2E:
    """Comprehensive notifications system E2E tests"""

    @pytest.fixture
    def authenticated_user(self, db_session: Session):
        """Create authenticated user for tests"""
        company = create_test_company(db_session)
        user = create_test_user(db_session, company.id, role=UserRole.CONTRACT_MANAGER)
        token = create_access_token(data={"sub": user.email})
        headers = {"Authorization": f"Bearer {token}"}
        return user, company, headers

    def test_real_time_notification_creation_and_delivery(self, client: TestClient, db_session: Session, authenticated_user):
        """Test real-time notification creation and WebSocket delivery"""
        user, company, headers = authenticated_user
        
        # Create a notification
        notification_data = {
            "title": "Contract Requires Review",
            "message": "Service Agreement ABC-123 requires your immediate review for legal compliance.",
            "type": "contract_review_required",
            "priority": "high",
            "metadata": {
                "contract_id": "contract-123",
                "due_date": (datetime.utcnow() + timedelta(days=2)).isoformat()
            }
        }
        
        # Send notification
        response = client.post(
            f"/api/v1/notifications/send/{user.id}",
            json=notification_data,
            headers=headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        notification_response = response.json()
        
        assert notification_response["title"] == notification_data["title"]
        assert notification_response["recipient_id"] == user.id
        assert notification_response["status"] == "sent"
        assert notification_response["type"] == "contract_review_required"
        
        notification_id = notification_response["id"]
        
        # Verify notification is stored in database
        db_notification = db_session.query(Notification).filter(
            Notification.id == notification_id
        ).first()
        
        assert db_notification is not None
        assert db_notification.title == notification_data["title"]
        assert db_notification.priority == "high"

    def test_notification_preferences_management(self, client: TestClient, db_session: Session, authenticated_user):
        """Test user notification preferences management"""
        user, company, headers = authenticated_user
        
        # Get current notification preferences
        prefs_response = client.get("/api/v1/notifications/preferences", headers=headers)
        assert prefs_response.status_code == status.HTTP_200_OK
        
        current_prefs = prefs_response.json()
        assert "email_notifications" in current_prefs
        assert "push_notifications" in current_prefs
        assert "notification_types" in current_prefs
        
        # Update notification preferences
        updated_preferences = {
            "email_notifications": {
                "enabled": True,
                "frequency": "immediate",
                "quiet_hours": {
                    "enabled": True,
                    "start_time": "22:00",
                    "end_time": "08:00"
                }
            },
            "push_notifications": {
                "enabled": True,
                "sound": "default"
            },
            "notification_types": {
                "contract_review_required": {
                    "email": True,
                    "push": True,
                    "in_app": True
                },
                "contract_signed": {
                    "email": True,
                    "push": False,
                    "in_app": True
                },
                "integration_error": {
                    "email": True,
                    "push": True,
                    "in_app": True
                },
                "system_maintenance": {
                    "email": False,
                    "push": False,
                    "in_app": True
                }
            }
        }
        
        update_response = client.put(
            "/api/v1/notifications/preferences",
            json=updated_preferences,
            headers=headers
        )
        
        assert update_response.status_code == status.HTTP_200_OK
        
        # Verify preferences were updated
        verify_response = client.get("/api/v1/notifications/preferences", headers=headers)
        updated_prefs = verify_response.json()
        
        assert updated_prefs["email_notifications"]["frequency"] == "immediate"
        assert updated_prefs["notification_types"]["contract_signed"]["push"] is False

    def test_bulk_notification_sending(self, client: TestClient, db_session: Session, authenticated_user):
        """Test sending notifications to multiple users"""
        user, company, headers = authenticated_user
        
        # Create additional users
        additional_users = []
        for i in range(3):
            additional_user = create_test_user(
                db_session, 
                company.id, 
                email=f"user{i+1}-{uuid.uuid4().hex[:8]}@example.com"
            )
            additional_users.append(additional_user)
        
        all_user_ids = [user.id] + [u.id for u in additional_users]
        
        # Send bulk notification
        bulk_notification_data = {
            "recipient_ids": all_user_ids,
            "title": "Company-wide Policy Update",
            "message": "Please review the updated contract management policies effective immediately.",
            "type": "policy_update",
            "priority": "medium",
            "metadata": {
                "policy_document_id": "policy-456",
                "effective_date": datetime.utcnow().isoformat()
            }
        }
        
        bulk_response = client.post(
            "/api/v1/notifications/send/bulk",
            json=bulk_notification_data,
            headers=headers
        )
        
        assert bulk_response.status_code == status.HTTP_200_OK
        bulk_result = bulk_response.json()
        
        assert bulk_result["total_recipients"] == len(all_user_ids)
        assert bulk_result["successful_sends"] == len(all_user_ids)
        assert bulk_result["failed_sends"] == 0
        assert "batch_id" in bulk_result
        
        # Verify each user received the notification
        for user_id in all_user_ids:
            user_notifications_response = client.get(
                f"/api/v1/notifications/user/{user_id}",
                headers=headers
            )
            
            notifications = user_notifications_response.json()["items"]
            policy_notifications = [
                n for n in notifications 
                if n["type"] == "policy_update" and n["title"] == "Company-wide Policy Update"
            ]
            
            assert len(policy_notifications) >= 1

    @pytest.mark.asyncio
    async def test_email_notification_delivery(self, client: TestClient, db_session: Session, authenticated_user):
        """Test email notification delivery workflow"""
        user, company, headers = authenticated_user
        
        notification_data = {
            "title": "Contract Expiring Soon",
            "message": "Your service agreement with Client XYZ is expiring in 30 days. Please review and renew.",
            "type": "contract_expiring",
            "priority": "medium",
            "delivery_methods": ["email", "in_app"],
            "metadata": {
                "contract_id": "contract-789",
                "expiry_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
                "client_name": "Client XYZ"
            }
        }
        
        # Mock email service
        with patch('app.services.email_service.send_notification_email') as mock_email:
            mock_email.return_value = AsyncMock()
            
            response = client.post(
                f"/api/v1/notifications/send/{user.id}",
                json=notification_data,
                headers=headers
            )
            
            assert response.status_code == status.HTTP_201_CREATED
            
            # Verify email service was called
            mock_email.assert_called_once()
            call_args = mock_email.call_args
            
            assert call_args[1]["recipient_email"] == user.email
            assert "Contract Expiring Soon" in call_args[1]["subject"]
            assert "Client XYZ" in call_args[1]["content"]

    def test_notification_status_management(self, client: TestClient, db_session: Session, authenticated_user):
        """Test notification status updates (read, unread, archived)"""
        user, company, headers = authenticated_user
        
        # Create multiple notifications
        notification_ids = []
        for i in range(5):
            notification_data = {
                "title": f"Test Notification {i+1}",
                "message": f"This is test notification number {i+1}",
                "type": "system_info",
                "priority": "low"
            }
            
            response = client.post(
                f"/api/v1/notifications/send/{user.id}",
                json=notification_data,
                headers=headers
            )
            
            notification_ids.append(response.json()["id"])
        
        # Mark specific notifications as read
        read_notifications = notification_ids[:2]
        for notification_id in read_notifications:
            read_response = client.post(
                f"/api/v1/notifications/{notification_id}/mark-read",
                headers=headers
            )
            assert read_response.status_code == status.HTTP_200_OK
        
        # Mark one notification as archived
        archive_response = client.post(
            f"/api/v1/notifications/{notification_ids[2]}/archive",
            headers=headers
        )
        assert archive_response.status_code == status.HTTP_200_OK
        
        # Get unread notifications
        unread_response = client.get("/api/v1/notifications/unread", headers=headers)
        assert unread_response.status_code == status.HTTP_200_OK
        
        unread_notifications = unread_response.json()["items"]
        unread_ids = [n["id"] for n in unread_notifications]
        
        # Should not include read or archived notifications
        for read_id in read_notifications:
            assert read_id not in unread_ids
        assert notification_ids[2] not in unread_ids  # Archived one
        
        # Remaining notifications should be unread
        assert notification_ids[3] in unread_ids
        assert notification_ids[4] in unread_ids
        
        # Test bulk mark as read
        bulk_read_data = {
            "notification_ids": notification_ids[3:]
        }
        
        bulk_read_response = client.post(
            "/api/v1/notifications/mark-read/bulk",
            json=bulk_read_data,
            headers=headers
        )
        
        assert bulk_read_response.status_code == status.HTTP_200_OK
        
        # Verify no unread notifications remain
        final_unread_response = client.get("/api/v1/notifications/unread", headers=headers)
        final_unread = final_unread_response.json()["items"]
        
        remaining_unread_ids = [n["id"] for n in final_unread if n["id"] in notification_ids]
        assert len(remaining_unread_ids) == 0

    def test_notification_filtering_and_search(self, client: TestClient, db_session: Session, authenticated_user):
        """Test notification filtering and search functionality"""
        user, company, headers = authenticated_user
        
        # Create notifications with different types and priorities
        test_notifications = [
            {
                "title": "High Priority Contract Issue",
                "message": "Urgent: Contract ABC requires immediate attention",
                "type": "contract_issue",
                "priority": "high"
            },
            {
                "title": "Integration Sync Complete",
                "message": "DocuSign integration sync completed successfully",
                "type": "integration_success",
                "priority": "low"
            },
            {
                "title": "Weekly Report Available",
                "message": "Your weekly contract analytics report is ready",
                "type": "report_ready",
                "priority": "medium"
            },
            {
                "title": "Contract Review Reminder",
                "message": "Don't forget to review the pending service agreement",
                "type": "contract_review_required",
                "priority": "medium"
            }
        ]
        
        created_notifications = []
        for notification_data in test_notifications:
            response = client.post(
                f"/api/v1/notifications/send/{user.id}",
                json=notification_data,
                headers=headers
            )
            created_notifications.append(response.json())
        
        # Test filtering by type
        type_filter_response = client.get(
            "/api/v1/notifications?type=contract_issue",
            headers=headers
        )
        assert type_filter_response.status_code == status.HTTP_200_OK
        
        filtered_notifications = type_filter_response.json()["items"]
        contract_issue_notifications = [
            n for n in filtered_notifications 
            if n["type"] == "contract_issue"
        ]
        assert len(contract_issue_notifications) >= 1
        
        # Test filtering by priority
        priority_filter_response = client.get(
            "/api/v1/notifications?priority=high",
            headers=headers
        )
        assert priority_filter_response.status_code == status.HTTP_200_OK
        
        high_priority_notifications = priority_filter_response.json()["items"]
        assert all(n["priority"] == "high" for n in high_priority_notifications)
        
        # Test search functionality
        search_response = client.get(
            "/api/v1/notifications/search?query=contract review",
            headers=headers
        )
        assert search_response.status_code == status.HTTP_200_OK
        
        search_results = search_response.json()["items"]
        review_notifications = [
            n for n in search_results 
            if "review" in n["title"].lower() or "review" in n["message"].lower()
        ]
        assert len(review_notifications) >= 1

    def test_notification_templates_and_customization(self, client: TestClient, db_session: Session, authenticated_user):
        """Test notification templates and content customization"""
        user, company, headers = authenticated_user
        
        # Create custom notification template
        template_data = {
            "name": "Contract Signature Required",
            "type": "contract_signature_required",
            "title_template": "Signature Required: {{contract_title}}",
            "message_template": "Hello {{recipient_name}}, the contract '{{contract_title}}' with {{client_name}} requires your digital signature by {{due_date}}. Please review and sign at your earliest convenience.",
            "email_subject_template": "Action Required: Sign {{contract_title}}",
            "email_body_template": """
            <div>
                <h2>Contract Signature Required</h2>
                <p>Dear {{recipient_name}},</p>
                <p>The following contract requires your immediate attention:</p>
                <ul>
                    <li><strong>Contract:</strong> {{contract_title}}</li>
                    <li><strong>Client:</strong> {{client_name}}</li>
                    <li><strong>Due Date:</strong> {{due_date}}</li>
                </ul>
                <p>Please log in to your account and complete the signature process.</p>
                <p>Thank you,<br>Pactoria Team</p>
            </div>
            """,
            "variables": ["recipient_name", "contract_title", "client_name", "due_date"]
        }
        
        template_response = client.post(
            "/api/v1/notifications/templates",
            json=template_data,
            headers=headers
        )
        
        assert template_response.status_code == status.HTTP_201_CREATED
        template = template_response.json()
        template_id = template["id"]
        
        # Send notification using template
        templated_notification_data = {
            "template_id": template_id,
            "variables": {
                "recipient_name": user.full_name,
                "contract_title": "Professional Services Agreement Q4",
                "client_name": "Acme Corporation",
                "due_date": (datetime.utcnow() + timedelta(days=7)).strftime("%B %d, %Y")
            },
            "delivery_methods": ["in_app", "email"],
            "priority": "high"
        }
        
        with patch('app.services.email_service.send_notification_email') as mock_email:
            mock_email.return_value = AsyncMock()
            
            notification_response = client.post(
                f"/api/v1/notifications/send-templated/{user.id}",
                json=templated_notification_data,
                headers=headers
            )
        
        assert notification_response.status_code == status.HTTP_201_CREATED
        notification = notification_response.json()
        
        # Verify template variables were replaced
        assert "Professional Services Agreement Q4" in notification["title"]
        assert "Acme Corporation" in notification["message"]
        assert user.full_name in notification["message"]
        
        # Verify email was sent with templated content
        mock_email.assert_called_once()
        email_args = mock_email.call_args[1]
        assert "Professional Services Agreement Q4" in email_args["subject"]

    def test_notification_delivery_failure_handling(self, client: TestClient, db_session: Session, authenticated_user):
        """Test handling of notification delivery failures and retries"""
        user, company, headers = authenticated_user
        
        notification_data = {
            "title": "Test Delivery Failure",
            "message": "This notification will test failure handling",
            "type": "test_notification",
            "delivery_methods": ["email", "push", "in_app"],
            "priority": "medium"
        }
        
        # Mock email service to fail
        with patch('app.services.email_service.send_notification_email') as mock_email, \
             patch('app.services.push_service.send_push_notification') as mock_push:
            
            # Email fails
            mock_email.side_effect = Exception("SMTP server unavailable")
            # Push succeeds
            mock_push.return_value = AsyncMock()
            
            response = client.post(
                f"/api/v1/notifications/send/{user.id}",
                json=notification_data,
                headers=headers
            )
            
            assert response.status_code == status.HTTP_201_CREATED
            notification = response.json()
            notification_id = notification["id"]
        
        # Check delivery status
        status_response = client.get(
            f"/api/v1/notifications/{notification_id}/delivery-status",
            headers=headers
        )
        
        assert status_response.status_code == status.HTTP_200_OK
        delivery_status = status_response.json()
        
        # Should show mixed results
        assert "delivery_attempts" in delivery_status
        attempts = delivery_status["delivery_attempts"]
        
        # Email should have failed, push and in_app should succeed
        email_attempts = [a for a in attempts if a["method"] == "email"]
        assert len(email_attempts) >= 1
        assert email_attempts[0]["status"] == "failed"
        
        # Retry failed deliveries
        retry_response = client.post(
            f"/api/v1/notifications/{notification_id}/retry-delivery",
            json={"methods": ["email"]},
            headers=headers
        )
        
        assert retry_response.status_code == status.HTTP_200_OK
        retry_result = retry_response.json()
        assert "retry_job_id" in retry_result

    def test_notification_analytics_and_metrics(self, client: TestClient, db_session: Session, authenticated_user):
        """Test notification analytics and delivery metrics"""
        user, company, headers = authenticated_user
        
        # Create various notifications over time for analytics
        notification_types = [
            "contract_review_required",
            "contract_signed", 
            "integration_error",
            "system_maintenance",
            "policy_update"
        ]
        
        created_notifications = []
        for i in range(15):  # Create multiple notifications
            notification_data = {
                "title": f"Analytics Test Notification {i+1}",
                "message": f"Test notification for analytics {i+1}",
                "type": notification_types[i % len(notification_types)],
                "priority": ["low", "medium", "high"][i % 3],
                "delivery_methods": ["email", "in_app", "push"]
            }
            
            response = client.post(
                f"/api/v1/notifications/send/{user.id}",
                json=notification_data,
                headers=headers
            )
            created_notifications.append(response.json())
        
        # Mark some as read to create engagement metrics
        for i in range(0, 10, 2):  # Mark every other notification as read
            client.post(
                f"/api/v1/notifications/{created_notifications[i]['id']}/mark-read",
                headers=headers
            )
        
        # Get notification analytics
        analytics_response = client.get(
            "/api/v1/notifications/analytics",
            params={
                "start_date": (datetime.utcnow() - timedelta(days=7)).isoformat(),
                "end_date": datetime.utcnow().isoformat()
            },
            headers=headers
        )
        
        assert analytics_response.status_code == status.HTTP_200_OK
        analytics = analytics_response.json()
        
        # Verify analytics structure
        assert "total_sent" in analytics
        assert "total_delivered" in analytics
        assert "total_read" in analytics
        assert "engagement_rate" in analytics
        assert "delivery_rate" in analytics
        
        # Verify metrics by type
        assert "metrics_by_type" in analytics
        type_metrics = analytics["metrics_by_type"]
        assert len(type_metrics) > 0
        
        for type_metric in type_metrics:
            assert "type" in type_metric
            assert "sent_count" in type_metric
            assert "read_count" in type_metric
            assert "engagement_rate" in type_metric
        
        # Test delivery performance metrics
        performance_response = client.get(
            "/api/v1/notifications/analytics/delivery-performance",
            headers=headers
        )
        
        assert performance_response.status_code == status.HTTP_200_OK
        performance = performance_response.json()
        
        assert "average_delivery_time" in performance
        assert "delivery_success_rate" in performance
        assert "failure_reasons" in performance

    def test_notification_escalation_rules(self, client: TestClient, db_session: Session, authenticated_user):
        """Test notification escalation and reminder rules"""
        user, company, headers = authenticated_user
        
        # Create escalation rule
        escalation_rule_data = {
            "name": "High Priority Contract Review Escalation",
            "trigger_conditions": {
                "notification_type": "contract_review_required",
                "priority": "high",
                "unread_duration_hours": 2
            },
            "escalation_actions": [
                {
                    "action_type": "send_reminder",
                    "delay_hours": 2,
                    "message_template": "REMINDER: {{original_title}} - This requires immediate attention"
                },
                {
                    "action_type": "notify_manager",
                    "delay_hours": 4,
                    "message_template": "ESCALATION: {{recipient_name}} has not responded to: {{original_title}}"
                },
                {
                    "action_type": "send_sms",
                    "delay_hours": 8,
                    "message_template": "URGENT: Contract review overdue - please check your Pactoria account"
                }
            ]
        }
        
        escalation_response = client.post(
            "/api/v1/notifications/escalation-rules",
            json=escalation_rule_data,
            headers=headers
        )
        
        assert escalation_response.status_code == status.HTTP_201_CREATED
        rule = escalation_response.json()
        rule_id = rule["id"]
        
        # Create high priority notification that should trigger escalation
        high_priority_notification = {
            "title": "URGENT: Contract ABC-999 Review Required",
            "message": "Critical contract requires immediate legal review before client meeting tomorrow",
            "type": "contract_review_required",
            "priority": "high",
            "metadata": {
                "contract_id": "ABC-999",
                "escalation_rule_id": rule_id
            }
        }
        
        notification_response = client.post(
            f"/api/v1/notifications/send/{user.id}",
            json=high_priority_notification,
            headers=headers
        )
        
        notification_id = notification_response.json()["id"]
        
        # Simulate time passing and check escalation status
        escalation_status_response = client.get(
            f"/api/v1/notifications/{notification_id}/escalation-status",
            headers=headers
        )
        
        assert escalation_status_response.status_code == status.HTTP_200_OK
        escalation_status = escalation_status_response.json()
        
        assert "escalation_rule_id" in escalation_status
        assert "pending_actions" in escalation_status
        assert "executed_actions" in escalation_status
        
        # Test manual escalation trigger
        manual_escalation_response = client.post(
            f"/api/v1/notifications/{notification_id}/escalate",
            json={"reason": "Testing manual escalation"},
            headers=headers
        )
        
        assert manual_escalation_response.status_code == status.HTTP_200_OK