"""
Comprehensive End-to-End Integration System Tests for Pactoria MVP

Tests external service integration workflows including connection management,
data synchronization, webhook handling, and integration monitoring.

Following TDD principles - comprehensive testing for maximum coverage.
"""

import pytest
import uuid
import json
from datetime import datetime, timedelta
from typing import Dict, Any
from unittest.mock import patch, AsyncMock, Mock
import httpx

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.security import create_access_token
from app.infrastructure.database.models import (
    User, Company, Integration, IntegrationConnection,
    UserRole, SubscriptionTier
)
from tests.conftest import create_test_company, create_test_user


class TestComprehensiveIntegrationsE2E:
    """Comprehensive integration system E2E tests"""

    @pytest.fixture
    def authenticated_user(self, db_session: Session):
        """Create authenticated user for tests"""
        company = create_test_company(db_session)
        user = create_test_user(db_session, company.id, role=UserRole.INTEGRATION_MANAGER)
        token = create_access_token(data={"sub": user.email})
        headers = {"Authorization": f"Bearer {token}"}
        return user, company, headers

    def test_integration_discovery_and_listing(self, client: TestClient, authenticated_user):
        """Test discovery and listing of available integrations"""
        user, company, headers = authenticated_user
        
        # Act - Get available integrations
        response = client.get("/api/v1/integrations/available", headers=headers)
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        integrations = response.json()["items"]
        
        # Verify expected integrations are available
        integration_names = [integration["name"] for integration in integrations]
        expected_integrations = ["DocuSign", "Salesforce", "HubSpot", "Microsoft 365", "Slack"]
        
        for expected in expected_integrations:
            assert any(expected.lower() in name.lower() for name in integration_names)
        
        # Verify integration details
        for integration in integrations:
            assert "id" in integration
            assert "name" in integration
            assert "description" in integration
            assert "category" in integration
            assert "supported_features" in integration
            assert "authentication_type" in integration

    def test_oauth_integration_connection_flow(self, client: TestClient, db_session: Session, authenticated_user):
        """Test OAuth-based integration connection workflow"""
        user, company, headers = authenticated_user
        
        # Step 1: Initiate OAuth flow
        oauth_request = {
            "integration_type": "docusign",
            "redirect_uri": "https://app.pactoria.com/integrations/callback"
        }
        
        oauth_response = client.post(
            "/api/v1/integrations/oauth/initiate", 
            json=oauth_request, 
            headers=headers
        )
        
        assert oauth_response.status_code == status.HTTP_200_OK
        oauth_data = oauth_response.json()
        
        assert "authorization_url" in oauth_data
        assert "state" in oauth_data
        assert "integration_id" in oauth_data
        
        # Verify authorization URL contains required parameters
        auth_url = oauth_data["authorization_url"]
        assert "client_id" in auth_url
        assert "redirect_uri" in auth_url
        assert "state" in auth_url
        
        # Step 2: Mock OAuth callback with authorization code
        callback_data = {
            "code": "mock_authorization_code_12345",
            "state": oauth_data["state"],
            "integration_id": oauth_data["integration_id"]
        }
        
        # Mock token exchange
        with patch('httpx.AsyncClient.post') as mock_post:
            mock_post.return_value = Mock(
                status_code=200,
                json=Mock(return_value={
                    "access_token": "mock_access_token",
                    "refresh_token": "mock_refresh_token",
                    "expires_in": 3600,
                    "token_type": "Bearer"
                })
            )
            
            callback_response = client.post(
                "/api/v1/integrations/oauth/callback",
                json=callback_data,
                headers=headers
            )
        
        assert callback_response.status_code == status.HTTP_200_OK
        connection_data = callback_response.json()
        
        assert connection_data["status"] == "connected"
        assert "connection_id" in connection_data
        assert connection_data["integration_type"] == "docusign"
        
        # Verify connection is stored in database
        connection_id = connection_data["connection_id"]
        db_connection = db_session.query(IntegrationConnection).filter(
            IntegrationConnection.id == connection_id
        ).first()
        
        assert db_connection is not None
        assert db_connection.company_id == company.id
        assert db_connection.status == "active"

    def test_api_key_integration_connection_flow(self, client: TestClient, db_session: Session, authenticated_user):
        """Test API key-based integration connection workflow"""
        user, company, headers = authenticated_user
        
        # Connect integration using API key
        api_key_request = {
            "integration_type": "hubspot",
            "credentials": {
                "api_key": "mock_hubspot_api_key_12345",
                "hub_domain": "testcompany.hubspot.com"
            },
            "configuration": {
                "sync_contacts": True,
                "sync_deals": True,
                "webhook_url": "https://api.pactoria.com/webhooks/hubspot"
            }
        }
        
        # Mock API key validation
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(
                status_code=200,
                json=Mock(return_value={
                    "hub_domain": "testcompany.hubspot.com",
                    "hub_id": 12345,
                    "portalId": 12345
                })
            )
            
            connection_response = client.post(
                "/api/v1/integrations/connect",
                json=api_key_request,
                headers=headers
            )
        
        assert connection_response.status_code == status.HTTP_201_CREATED
        connection_data = connection_response.json()
        
        assert connection_data["status"] == "active"
        assert connection_data["integration_type"] == "hubspot"
        assert "connection_id" in connection_data
        
        # Test connection validation
        connection_id = connection_data["connection_id"]
        test_response = client.post(
            f"/api/v1/integrations/{connection_id}/test",
            headers=headers
        )
        
        assert test_response.status_code == status.HTTP_200_OK
        test_result = test_response.json()
        assert test_result["connection_valid"] is True

    def test_integration_data_synchronization(self, client: TestClient, db_session: Session, authenticated_user):
        """Test data synchronization between Pactoria and external systems"""
        user, company, headers = authenticated_user
        
        # First, establish a connection (mocked)
        connection_data = {
            "integration_type": "salesforce",
            "credentials": {"access_token": "mock_sf_token"},
            "configuration": {"sync_accounts": True, "sync_opportunities": True}
        }
        
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(status_code=200, json=Mock(return_value={"id": "test"}))
            
            connection_response = client.post(
                "/api/v1/integrations/connect",
                json=connection_data,
                headers=headers
            )
            
            connection_id = connection_response.json()["connection_id"]
        
        # Mock Salesforce API responses
        mock_sf_accounts = {
            "records": [
                {
                    "Id": "001XX000003DHP0",
                    "Name": "Acme Corporation",
                    "Type": "Customer",
                    "Industry": "Technology",
                    "Phone": "+1-555-0123"
                },
                {
                    "Id": "001XX000003DHP1", 
                    "Name": "Global Industries",
                    "Type": "Prospect",
                    "Industry": "Manufacturing",
                    "Phone": "+1-555-0456"
                }
            ]
        }
        
        mock_sf_opportunities = {
            "records": [
                {
                    "Id": "006XX000004TMaW",
                    "Name": "New Contract - Acme Corp",
                    "AccountId": "001XX000003DHP0",
                    "StageName": "Negotiation",
                    "Amount": 50000,
                    "CloseDate": "2024-12-31"
                }
            ]
        }
        
        # Start synchronization
        sync_request = {
            "sync_type": "full",
            "entities": ["accounts", "opportunities"]
        }
        
        with patch('httpx.AsyncClient.get') as mock_get:
            # Mock different responses based on URL
            def side_effect(url, **kwargs):
                if "sobjects/Account" in str(url):
                    return Mock(status_code=200, json=Mock(return_value=mock_sf_accounts))
                elif "sobjects/Opportunity" in str(url):
                    return Mock(status_code=200, json=Mock(return_value=mock_sf_opportunities))
                else:
                    return Mock(status_code=200, json=Mock(return_value={"id": "test"}))
            
            mock_get.side_effect = side_effect
            
            sync_response = client.post(
                f"/api/v1/integrations/{connection_id}/sync",
                json=sync_request,
                headers=headers
            )
        
        assert sync_response.status_code == status.HTTP_200_OK
        sync_result = sync_response.json()
        
        assert "sync_job_id" in sync_result
        assert sync_result["status"] == "started"
        
        # Check sync status
        sync_job_id = sync_result["sync_job_id"]
        status_response = client.get(
            f"/api/v1/integrations/{connection_id}/sync/{sync_job_id}/status",
            headers=headers
        )
        
        assert status_response.status_code == status.HTTP_200_OK
        status_data = status_response.json()
        
        assert "status" in status_data
        assert "progress" in status_data
        assert "synced_records" in status_data

    def test_webhook_handling_and_processing(self, client: TestClient, db_session: Session, authenticated_user):
        """Test webhook reception and processing from external systems"""
        user, company, headers = authenticated_user
        
        # Set up integration connection first
        connection_data = {
            "integration_type": "docusign",
            "credentials": {"access_token": "mock_token"},
            "configuration": {"webhook_url": "https://api.pactoria.com/webhooks/docusign"}
        }
        
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(status_code=200, json=Mock(return_value={"userId": "test"}))
            
            connection_response = client.post(
                "/api/v1/integrations/connect",
                json=connection_data,
                headers=headers
            )
            
            connection_id = connection_response.json()["connection_id"]
        
        # Simulate DocuSign webhook payload
        webhook_payload = {
            "event": "envelope-completed",
            "apiVersion": "v2.1",
            "uri": "/restapi/v2.1/accounts/123456/envelopes/envelope-123",
            "retryCount": 0,
            "configurationId": 12345,
            "generatedDateTime": "2024-01-15T10:30:00.0000000Z",
            "data": {
                "envelopeId": "envelope-123",
                "accountId": "123456",
                "userId": "user-456",
                "envelopeSummary": {
                    "status": "completed",
                    "documentsUri": "/envelopes/envelope-123/documents",
                    "recipientsUri": "/envelopes/envelope-123/recipients",
                    "envelopeId": "envelope-123",
                    "customFieldsUri": "/envelopes/envelope-123/custom_fields",
                    "notificationUri": "/envelopes/envelope-123/notification",
                    "enableWetSign": "true",
                    "allowMarkup": "false",
                    "allowReassign": "true",
                    "createdDateTime": "2024-01-15T09:00:00.0000000Z",
                    "lastModifiedDateTime": "2024-01-15T10:30:00.0000000Z",
                    "deliveredDateTime": "2024-01-15T10:30:00.0000000Z",
                    "sentDateTime": "2024-01-15T09:05:00.0000000Z",
                    "completedDateTime": "2024-01-15T10:30:00.0000000Z",
                    "subject": "Service Agreement - Please Sign",
                    "emailSubject": "Please DocuSign: Service Agreement",
                    "signingLocation": "online",
                    "customFields": {
                        "textCustomFields": [
                            {"name": "contract_id", "value": "contract-789"}
                        ]
                    }
                }
            }
        }
        
        # Send webhook to the system
        webhook_response = client.post(
            f"/api/v1/webhooks/docusign/{connection_id}",
            json=webhook_payload,
            headers={"X-DocuSign-Signature-1": "mock_signature"}
        )
        
        assert webhook_response.status_code == status.HTTP_200_OK
        
        # Verify webhook processing
        webhook_result = webhook_response.json()
        assert webhook_result["status"] == "processed"
        assert "event_id" in webhook_result
        
        # Check if contract status was updated based on webhook
        contract_id = "contract-789"
        contract_response = client.get(f"/api/v1/contracts/{contract_id}", headers=headers)
        
        # Note: This assumes the contract exists and was updated by the webhook
        if contract_response.status_code == status.HTTP_200_OK:
            contract_data = contract_response.json()
            assert contract_data.get("signature_status") == "completed"

    def test_integration_monitoring_and_health_checks(self, client: TestClient, db_session: Session, authenticated_user):
        """Test integration health monitoring and status reporting"""
        user, company, headers = authenticated_user
        
        # Create multiple integration connections
        integrations = [
            {"type": "docusign", "status": "active"},
            {"type": "salesforce", "status": "active"},
            {"type": "hubspot", "status": "error"}
        ]
        
        connection_ids = []
        for integration in integrations:
            connection_data = {
                "integration_type": integration["type"],
                "credentials": {"access_token": f"mock_{integration['type']}_token"},
                "configuration": {}
            }
            
            # Mock successful connection
            with patch('httpx.AsyncClient.get') as mock_get:
                if integration["status"] == "error":
                    mock_get.return_value = Mock(status_code=401)  # Unauthorized
                else:
                    mock_get.return_value = Mock(status_code=200, json=Mock(return_value={"id": "test"}))
                
                response = client.post("/api/v1/integrations/connect", json=connection_data, headers=headers)
                if response.status_code == 201:
                    connection_ids.append(response.json()["connection_id"])
        
        # Get integration status dashboard
        dashboard_response = client.get("/api/v1/integrations/status", headers=headers)
        assert dashboard_response.status_code == status.HTTP_200_OK
        
        status_data = dashboard_response.json()
        assert "connections" in status_data
        assert "health_summary" in status_data
        
        # Verify health summary
        health_summary = status_data["health_summary"]
        assert "total_connections" in health_summary
        assert "active_connections" in health_summary
        assert "error_connections" in health_summary
        assert "last_sync_times" in health_summary
        
        # Test individual connection health check
        if connection_ids:
            health_check_response = client.post(
                f"/api/v1/integrations/{connection_ids[0]}/health-check",
                headers=headers
            )
            assert health_check_response.status_code == status.HTTP_200_OK
            
            health_data = health_check_response.json()
            assert "status" in health_data
            assert "response_time_ms" in health_data
            assert "last_successful_sync" in health_data

    def test_integration_error_handling_and_recovery(self, client: TestClient, db_session: Session, authenticated_user):
        """Test error handling and recovery mechanisms for integrations"""
        user, company, headers = authenticated_user
        
        # Create connection that will fail
        connection_data = {
            "integration_type": "salesforce",
            "credentials": {"access_token": "invalid_token"},
            "configuration": {"sync_accounts": True}
        }
        
        # Mock connection establishment (successful)
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(status_code=200, json=Mock(return_value={"id": "test"}))
            
            connection_response = client.post(
                "/api/v1/integrations/connect",
                json=connection_data,
                headers=headers
            )
            
            connection_id = connection_response.json()["connection_id"]
        
        # Attempt sync that will fail due to invalid token
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(status_code=401, json=Mock(return_value={"error": "invalid_grant"}))
            
            sync_response = client.post(
                f"/api/v1/integrations/{connection_id}/sync",
                json={"sync_type": "incremental", "entities": ["accounts"]},
                headers=headers
            )
        
        # Should handle error gracefully
        assert sync_response.status_code == status.HTTP_400_BAD_REQUEST
        error_data = sync_response.json()
        assert "error" in error_data
        assert "authentication" in error_data["error"].lower() or "token" in error_data["error"].lower()
        
        # Test retry mechanism
        retry_response = client.post(
            f"/api/v1/integrations/{connection_id}/retry-sync",
            json={"retry_attempts": 3, "backoff_strategy": "exponential"},
            headers=headers
        )
        
        assert retry_response.status_code == status.HTTP_200_OK
        retry_data = retry_response.json()
        assert "retry_job_id" in retry_data
        assert retry_data["status"] == "scheduled"
        
        # Test connection refresh/re-authentication
        refresh_response = client.post(
            f"/api/v1/integrations/{connection_id}/refresh-auth",
            headers=headers
        )
        
        # Should handle refresh appropriately
        assert refresh_response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_integration_data_mapping_and_transformation(self, client: TestClient, db_session: Session, authenticated_user):
        """Test data mapping and transformation between systems"""
        user, company, headers = authenticated_user
        
        # Set up integration with custom field mappings
        connection_data = {
            "integration_type": "hubspot",
            "credentials": {"api_key": "mock_hubspot_key"},
            "configuration": {
                "field_mappings": {
                    "contacts": {
                        "email": "email",
                        "firstname": "first_name",
                        "lastname": "last_name",
                        "company": "company_name",
                        "phone": "phone_number",
                        "hs_lead_status": "lead_status"
                    },
                    "deals": {
                        "dealname": "opportunity_name",
                        "amount": "deal_value",
                        "dealstage": "stage",
                        "closedate": "expected_close_date"
                    }
                },
                "transformation_rules": {
                    "phone_number": "format_phone_uk",
                    "deal_value": "convert_to_gbp",
                    "lead_status": "map_lead_status"
                }
            }
        }
        
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(status_code=200, json=Mock(return_value={"portalId": 12345}))
            
            connection_response = client.post(
                "/api/v1/integrations/connect",
                json=connection_data,
                headers=headers
            )
            
            connection_id = connection_response.json()["connection_id"]
        
        # Test field mapping validation
        mapping_response = client.get(
            f"/api/v1/integrations/{connection_id}/field-mappings",
            headers=headers
        )
        
        assert mapping_response.status_code == status.HTTP_200_OK
        mapping_data = mapping_response.json()
        
        assert "source_fields" in mapping_data
        assert "target_fields" in mapping_data
        assert "current_mappings" in mapping_data
        
        # Test data transformation preview
        sample_data = {
            "records": [
                {
                    "email": "john.doe@example.com",
                    "firstname": "John",
                    "lastname": "Doe",
                    "phone": "07700 900123",
                    "hs_lead_status": "new"
                }
            ]
        }
        
        transform_response = client.post(
            f"/api/v1/integrations/{connection_id}/transform-preview",
            json={"sample_data": sample_data},
            headers=headers
        )
        
        assert transform_response.status_code == status.HTTP_200_OK
        transform_data = transform_response.json()
        
        assert "transformed_records" in transform_data
        transformed_record = transform_data["transformed_records"][0]
        
        # Verify transformations were applied
        assert transformed_record["first_name"] == "John"
        assert transformed_record["last_name"] == "Doe"
        assert "phone_number" in transformed_record  # Transformed field name

    def test_integration_permissions_and_security(self, client: TestClient, db_session: Session):
        """Test integration access control and security measures"""
        # Create two companies with different users
        company1 = create_test_company(db_session, name="Company 1")
        company2 = create_test_company(db_session, name="Company 2")
        
        user1 = create_test_user(db_session, company1.id, role=UserRole.INTEGRATION_MANAGER)
        user2 = create_test_user(db_session, company2.id, role=UserRole.CONTRACT_MANAGER)  # No integration perms
        
        token1 = create_access_token(data={"sub": user1.email})
        token2 = create_access_token(data={"sub": user2.email})
        
        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}
        
        # User 1 creates integration
        connection_data = {
            "integration_type": "docusign",
            "credentials": {"access_token": "secret_token"},
            "configuration": {}
        }
        
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(status_code=200, json=Mock(return_value={"userId": "test"}))
            
            response1 = client.post("/api/v1/integrations/connect", json=connection_data, headers=headers1)
            assert response1.status_code == status.HTTP_201_CREATED
            connection_id = response1.json()["connection_id"]
        
        # User 2 should not have access to User 1's integrations
        unauthorized_response = client.get(f"/api/v1/integrations/{connection_id}", headers=headers2)
        assert unauthorized_response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
        
        # User 2 should not be able to create integrations (insufficient permissions)
        response2 = client.post("/api/v1/integrations/connect", json=connection_data, headers=headers2)
        assert response2.status_code == status.HTTP_403_FORBIDDEN
        
        # User 1 should still have access
        authorized_response = client.get(f"/api/v1/integrations/{connection_id}", headers=headers1)
        assert authorized_response.status_code == status.HTTP_200_OK

    def test_integration_configuration_management(self, client: TestClient, db_session: Session, authenticated_user):
        """Test integration configuration updates and management"""
        user, company, headers = authenticated_user
        
        # Create initial integration
        connection_data = {
            "integration_type": "salesforce",
            "credentials": {"access_token": "initial_token"},
            "configuration": {
                "sync_frequency": "hourly",
                "sync_entities": ["accounts", "contacts"],
                "field_mappings": {"Name": "company_name"}
            }
        }
        
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(status_code=200, json=Mock(return_value={"id": "test"}))
            
            connection_response = client.post(
                "/api/v1/integrations/connect",
                json=connection_data,
                headers=headers
            )
            
            connection_id = connection_response.json()["connection_id"]
        
        # Update configuration
        updated_config = {
            "sync_frequency": "daily",
            "sync_entities": ["accounts", "contacts", "opportunities"],
            "field_mappings": {
                "Name": "company_name",
                "Phone": "phone_number",
                "Industry": "industry_type"
            },
            "filters": {
                "account_type": ["Customer", "Prospect"],
                "last_modified": "30_days"
            }
        }
        
        config_response = client.put(
            f"/api/v1/integrations/{connection_id}/configuration",
            json={"configuration": updated_config},
            headers=headers
        )
        
        assert config_response.status_code == status.HTTP_200_OK
        
        # Verify configuration was updated
        get_response = client.get(f"/api/v1/integrations/{connection_id}", headers=headers)
        integration_data = get_response.json()
        
        assert integration_data["configuration"]["sync_frequency"] == "daily"
        assert "opportunities" in integration_data["configuration"]["sync_entities"]
        assert "filters" in integration_data["configuration"]

    def test_integration_analytics_and_reporting(self, client: TestClient, db_session: Session, authenticated_user):
        """Test integration analytics and performance reporting"""
        user, company, headers = authenticated_user
        
        # Set up integration
        connection_data = {
            "integration_type": "hubspot",
            "credentials": {"api_key": "test_key"},
            "configuration": {"sync_contacts": True, "sync_deals": True}
        }
        
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(status_code=200, json=Mock(return_value={"portalId": 12345}))
            
            connection_response = client.post(
                "/api/v1/integrations/connect",
                json=connection_data,
                headers=headers
            )
            
            connection_id = connection_response.json()["connection_id"]
        
        # Get integration analytics
        analytics_response = client.get(
            f"/api/v1/integrations/{connection_id}/analytics",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
                "metrics": "sync_performance,data_volume,error_rates"
            },
            headers=headers
        )
        
        assert analytics_response.status_code == status.HTTP_200_OK
        analytics_data = analytics_response.json()
        
        # Verify analytics structure
        assert "sync_performance" in analytics_data
        assert "data_volume" in analytics_data
        assert "error_rates" in analytics_data
        
        sync_perf = analytics_data["sync_performance"]
        assert "total_syncs" in sync_perf
        assert "successful_syncs" in sync_perf
        assert "average_sync_duration" in sync_perf
        
        # Get company-wide integration report
        company_report_response = client.get(
            "/api/v1/integrations/analytics/company-report",
            params={"period": "last_30_days"},
            headers=headers
        )
        
        assert company_report_response.status_code == status.HTTP_200_OK
        report_data = company_report_response.json()
        
        assert "total_integrations" in report_data
        assert "active_integrations" in report_data
        assert "data_synced_volume" in report_data
        assert "integration_health_score" in report_data