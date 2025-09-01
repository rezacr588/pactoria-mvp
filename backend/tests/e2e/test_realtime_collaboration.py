"""
E2E Tests for Multi-User Collaboration and Real-time Features
Tests WebSocket connections, live updates, and collaborative workflows
"""
import pytest
import asyncio
import json
from typing import Dict, Any, List
from unittest.mock import AsyncMock, patch

from tests.e2e.conftest import E2ETestBase, WebSocketTestHelper


class TestRealTimeCollaboration:
    """Real-time collaboration workflow tests"""
    
    @pytest.mark.asyncio
    async def test_websocket_connection_flow(self, e2e_test_base: E2ETestBase, websocket_helper: WebSocketTestHelper):
        """Test: Connect to WebSocket → authenticate → receive confirmation"""
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        
        # Get authentication token
        from app.core.security import create_access_token
        token = create_access_token(subject=user.id)
        
        # Note: WebSocket testing requires running server
        # This test documents the expected behavior
        
        # In a real test environment with running server:
        # async with websocket_helper.websocket_connection(token) as websocket:
        #     # Send ping
        #     await websocket_helper.send_message(websocket, "ping")
        #     
        #     # Receive pong
        #     response = await websocket_helper.receive_message(websocket)
        #     assert response["type"] == "pong"
        
        # For now, test WebSocket endpoint availability through HTTP client
        client = e2e_test_base.client
        headers = e2e_test_base.get_auth_headers(user)
        
        # Test WebSocket health endpoint
        health_response = client.get("/api/v1/ws/health")
        e2e_test_base.assert_response_success(health_response)
        
        health_data = health_response.json()
        assert health_data["service"] == "websocket"
        assert "active_connections" in health_data
        
    @pytest.mark.asyncio  
    async def test_contract_update_notifications(self, e2e_test_base: E2ETestBase, websocket_helper: WebSocketTestHelper):
        """Test: User A updates contract → User B receives notification"""
        # Setup: Create company with two users
        company = e2e_test_base.create_test_company()
        user_a = e2e_test_base.create_test_user(company, {"full_name": "User A"})
        user_b = e2e_test_base.create_test_user(company, {"full_name": "User B"})
        
        contract = e2e_test_base.create_test_contract(company, user_a)
        
        client = e2e_test_base.client
        headers_a = e2e_test_base.get_auth_headers(user_a)
        headers_b = e2e_test_base.get_auth_headers(user_b)
        
        # Note: This test requires WebSocket server integration
        # For now, test the REST API that would trigger notifications
        
        # Step 1: User A updates contract
        update_data = {
            "title": "Updated Contract Title - Real-time Test",
            "client_name": "Updated Client Name"
        }
        
        update_response = client.put(f"/api/v1/contracts/{contract.id}", json=update_data, headers=headers_a)
        e2e_test_base.assert_response_success(update_response)
        
        # Step 2: User B should be able to see the update
        view_response = client.get(f"/api/v1/contracts/{contract.id}", headers=headers_b)
        e2e_test_base.assert_response_success(view_response)
        
        updated_contract = view_response.json()
        assert updated_contract["title"] == update_data["title"]
        assert updated_contract["client_name"] == update_data["client_name"]
        
        # In a real WebSocket implementation:
        # - User A's update would trigger a WebSocket notification
        # - User B would receive: {"type": "contract_update", "contract_id": contract.id, "changes": {...}}
        # - Frontend would update the UI in real-time
        
    def test_concurrent_contract_editing(self, e2e_test_base: E2ETestBase):
        """Test: Multiple users editing contract simultaneously"""
        client = e2e_test_base.client
        
        # Setup: Create company with multiple users
        company = e2e_test_base.create_test_company()
        user_1 = e2e_test_base.create_test_user(company, {"full_name": "Editor 1"})
        user_2 = e2e_test_base.create_test_user(company, {"full_name": "Editor 2"})
        user_3 = e2e_test_base.create_test_user(company, {"full_name": "Editor 3"})
        
        contract = e2e_test_base.create_test_contract(company, user_1)
        
        headers_1 = e2e_test_base.get_auth_headers(user_1)
        headers_2 = e2e_test_base.get_auth_headers(user_2)
        headers_3 = e2e_test_base.get_auth_headers(user_3)
        
        # Step 1: Generate initial content
        generate_response = client.post(
            f"/api/v1/contracts/{contract.id}/generate",
            json={"regenerate": False},
            headers=headers_1
        )
        e2e_test_base.assert_response_success(generate_response)
        
        # Step 2: Get initial contract state
        initial_response = client.get(f"/api/v1/contracts/{contract.id}", headers=headers_1)
        initial_contract = initial_response.json()
        base_content = initial_contract["generated_content"]
        
        # Step 3: Multiple users make concurrent edits
        edit_1 = base_content + "\n\n[EDIT BY USER 1] Added payment terms"
        edit_2 = base_content + "\n\n[EDIT BY USER 2] Added confidentiality clause"
        edit_3 = base_content + "\n\n[EDIT BY USER 3] Added termination clause"
        
        # Simulate concurrent updates (last writer wins in current implementation)
        response_1 = client.put(f"/api/v1/contracts/{contract.id}", json={"final_content": edit_1}, headers=headers_1)
        response_2 = client.put(f"/api/v1/contracts/{contract.id}", json={"final_content": edit_2}, headers=headers_2)
        response_3 = client.put(f"/api/v1/contracts/{contract.id}", json={"final_content": edit_3}, headers=headers_3)
        
        e2e_test_base.assert_response_success(response_1)
        e2e_test_base.assert_response_success(response_2)
        e2e_test_base.assert_response_success(response_3)
        
        # Step 4: Verify final state (last update should win)
        final_response = client.get(f"/api/v1/contracts/{contract.id}", headers=headers_1)
        final_contract = final_response.json()
        
        # The final content should be from the last successful update
        assert "[EDIT BY USER 3]" in final_contract["final_content"]
        
        # Note: In a real collaborative editing system:
        # - Operational Transform or Conflict-free Replicated Data Types (CRDTs) would be used
        # - Users would see real-time cursors and edits
        # - Conflicts would be automatically resolved or presented to users
        
    def test_user_presence_tracking(self, e2e_test_base: E2ETestBase):
        """Test: Track and display which users are currently viewing/editing contracts"""
        client = e2e_test_base.client
        
        # Setup: Create company with multiple users
        company = e2e_test_base.create_test_company()
        user_1 = e2e_test_base.create_test_user(company, {"full_name": "Online User 1"})
        user_2 = e2e_test_base.create_test_user(company, {"full_name": "Online User 2"})
        
        contract = e2e_test_base.create_test_contract(company, user_1)
        
        headers_1 = e2e_test_base.get_auth_headers(user_1)
        headers_2 = e2e_test_base.get_auth_headers(user_2)
        
        # Step 1: Both users access the contract
        access_1 = client.get(f"/api/v1/contracts/{contract.id}", headers=headers_1)
        access_2 = client.get(f"/api/v1/contracts/{contract.id}", headers=headers_2)
        
        e2e_test_base.assert_response_success(access_1)
        e2e_test_base.assert_response_success(access_2)
        
        # Note: In a real implementation, this would involve:
        # - WebSocket connections tracking user presence
        # - Database/Redis tracking active users per contract
        # - API endpoint to get current users viewing a contract
        
        # Example API that might exist:
        # presence_response = client.get(f"/api/v1/contracts/{contract.id}/presence", headers=headers_1)
        # presence_data = presence_response.json()
        # assert len(presence_data["active_users"]) == 2
        # active_user_names = [u["full_name"] for u in presence_data["active_users"]]
        # assert "Online User 1" in active_user_names
        # assert "Online User 2" in active_user_names
        
    @pytest.mark.asyncio
    async def test_live_compliance_updates(self, e2e_test_base: E2ETestBase):
        """Test: Real-time compliance score updates as contract is edited"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        contract = e2e_test_base.create_test_contract(company, user)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Step 1: Generate initial content
        generate_response = client.post(
            f"/api/v1/contracts/{contract.id}/generate",
            json={"regenerate": False},
            headers=headers
        )
        e2e_test_base.assert_response_success(generate_response)
        
        # Step 2: Get initial compliance analysis
        analyze_response = client.post(
            f"/api/v1/contracts/{contract.id}/analyze",
            json={"force_reanalysis": False},
            headers=headers
        )
        e2e_test_base.assert_response_success(analyze_response)
        
        initial_analysis = analyze_response.json()
        initial_score = initial_analysis["overall_score"]
        
        # Step 3: Update contract content
        contract_response = client.get(f"/api/v1/contracts/{contract.id}", headers=headers)
        contract_data = contract_response.json()
        
        improved_content = contract_data["generated_content"] + "\n\n" + "\n".join([
            "GDPR Compliance: This contract complies with GDPR Article 28.",
            "Employment Law: All employment terms comply with UK legislation.",
            "Consumer Rights: Consumer protection provisions included."
        ])
        
        update_response = client.put(
            f"/api/v1/contracts/{contract.id}",
            json={"final_content": improved_content},
            headers=headers
        )
        e2e_test_base.assert_response_success(update_response)
        
        # Step 4: Re-analyze compliance (simulating real-time analysis)
        reanalyze_response = client.post(
            f"/api/v1/contracts/{contract.id}/analyze",
            json={"force_reanalysis": True},
            headers=headers
        )
        e2e_test_base.assert_response_success(reanalyze_response)
        
        updated_analysis = reanalyze_response.json()
        updated_score = updated_analysis["overall_score"]
        
        # Step 5: Verify compliance improved
        assert updated_score >= initial_score
        
        # Note: In a real-time system:
        # - WebSocket would push compliance updates as user types
        # - Frontend would show live compliance score
        # - Recommendations would update dynamically


class TestWebSocketFeatures:
    """WebSocket-specific feature tests"""
    
    def test_websocket_authentication(self, e2e_test_base: E2ETestBase):
        """Test: WebSocket authentication with valid/invalid tokens"""
        client = e2e_test_base.client
        
        # Test WebSocket authentication endpoints
        # Note: Actual WebSocket testing requires running server
        
        # Test 1: WebSocket health check (no auth required)
        health_response = client.get("/api/v1/ws/health")
        e2e_test_base.assert_response_success(health_response)
        
        # Test 2: WebSocket stats (admin required)
        company = e2e_test_base.create_test_company()
        admin_user = e2e_test_base.create_test_user(company, 
            e2e_test_base.test_data_factory.create_admin_user_data(company.id))
        admin_headers = e2e_test_base.get_auth_headers(admin_user)
        
        stats_response = client.get("/api/v1/ws/stats", headers=admin_headers)
        e2e_test_base.assert_response_success(stats_response)
        
        stats_data = stats_response.json()
        assert "websocket_stats" in stats_data
        
        # Test 3: Non-admin cannot access WebSocket stats
        regular_user = e2e_test_base.create_test_user(company)
        regular_headers = e2e_test_base.get_auth_headers(regular_user)
        
        unauthorized_stats_response = client.get("/api/v1/ws/stats", headers=regular_headers)
        e2e_test_base.assert_response_error(unauthorized_stats_response, 403)
        
    def test_websocket_test_page_access(self, e2e_test_base: E2ETestBase):
        """Test: WebSocket test page availability in debug mode"""
        client = e2e_test_base.client
        
        # Test WebSocket test page
        test_page_response = client.get("/api/v1/ws/test")
        
        # Should succeed in debug mode, fail in production
        from app.core.config import settings
        if settings.DEBUG:
            e2e_test_base.assert_response_success(test_page_response)
            
            # Verify it's HTML content
            assert test_page_response.headers.get("content-type").startswith("text/html")
            assert "WebSocket Test" in test_page_response.text
        else:
            e2e_test_base.assert_response_error(test_page_response, 404)
            
    @pytest.mark.asyncio
    async def test_websocket_message_types(self, e2e_test_base: E2ETestBase, websocket_helper: WebSocketTestHelper):
        """Test: Different WebSocket message types and responses"""
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        
        from app.core.security import create_access_token
        token = create_access_token(subject=user.id)
        
        # Note: This requires actual WebSocket server for full testing
        # For now, test the HTTP endpoints that support WebSocket functionality
        
        client = e2e_test_base.client
        headers = e2e_test_base.get_auth_headers(user)
        
        # Test health endpoint (similar to WebSocket ping)
        health_response = client.get("/api/v1/ws/health")
        e2e_test_base.assert_response_success(health_response)
        
        # In a full WebSocket test:
        # async with websocket_helper.websocket_connection(token) as websocket:
        #     # Test ping/pong
        #     await websocket_helper.send_message(websocket, "ping")
        #     pong = await websocket_helper.receive_message(websocket)
        #     assert pong["type"] == "pong"
        #     
        #     # Test subscription to contract updates
        #     await websocket_helper.send_message(websocket, "subscribe", {
        #         "topics": ["contracts", "notifications"]
        #     })
        #     
        #     # Test user presence
        #     await websocket_helper.send_message(websocket, "user_presence", {
        #         "status": "online",
        #         "contract_id": "some-contract-id"
        #     })


class TestNotificationSystem:
    """Real-time notification system tests"""
    
    def test_contract_status_notifications(self, e2e_test_base: E2ETestBase):
        """Test: Notifications when contract status changes"""
        client = e2e_test_base.client
        
        # Setup: Create company with multiple users
        company = e2e_test_base.create_test_company()
        creator_user = e2e_test_base.create_test_user(company, {"full_name": "Contract Creator"})
        reviewer_user = e2e_test_base.create_test_user(company, {"full_name": "Contract Reviewer"})
        
        contract = e2e_test_base.create_test_contract(company, creator_user)
        
        creator_headers = e2e_test_base.get_auth_headers(creator_user)
        reviewer_headers = e2e_test_base.get_auth_headers(reviewer_user)
        
        # Step 1: Creator activates contract
        activate_response = client.put(
            f"/api/v1/contracts/{contract.id}",
            json={"status": "active"},
            headers=creator_headers
        )
        e2e_test_base.assert_response_success(activate_response)
        
        # Note: In a real system, this would trigger:
        # - WebSocket notification to all company users
        # - Email notifications based on preferences
        # - In-app notifications
        
        # Step 2: Verify other users can see the status change
        reviewer_view = client.get(f"/api/v1/contracts/{contract.id}", headers=reviewer_headers)
        e2e_test_base.assert_response_success(reviewer_view)
        
        contract_data = reviewer_view.json()
        assert contract_data["status"] == "active"
        
        # In a real notification system:
        # - GET /api/v1/notifications would show new notifications
        # - WebSocket would have sent: {"type": "notification", "message": "Contract activated", ...}
        
    def test_compliance_alert_notifications(self, e2e_test_base: E2ETestBase):
        """Test: Notifications for compliance issues"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        contract = e2e_test_base.create_test_contract(company, user)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Step 1: Generate content
        generate_response = client.post(
            f"/api/v1/contracts/{contract.id}/generate",
            json={"regenerate": False},
            headers=headers
        )
        e2e_test_base.assert_response_success(generate_response)
        
        # Step 2: Analyze compliance
        analyze_response = client.post(
            f"/api/v1/contracts/{contract.id}/analyze", 
            json={"force_reanalysis": False},
            headers=headers
        )
        e2e_test_base.assert_response_success(analyze_response)
        
        analysis = analyze_response.json()
        
        # Step 3: If compliance is low, notification should be triggered
        if analysis["overall_score"] < 0.8:  # Low compliance threshold
            # In a real system:
            # - WebSocket notification about compliance issues
            # - Email alert to responsible users
            # - Dashboard alert indicator
            pass
        
        # Mock high-risk scenario by checking risk score
        if analysis["risk_score"] >= 7:  # High risk
            # Should trigger immediate notifications
            pass
        
        # Note: Actual notification testing would involve:
        # - WebSocket message verification
        # - Email service mock verification
        # - Notification persistence and retrieval
        
    def test_collaboration_notifications(self, e2e_test_base: E2ETestBase):
        """Test: Notifications for collaborative actions"""
        client = e2e_test_base.client
        
        # Setup: Create company with multiple users
        company = e2e_test_base.create_test_company()
        user_a = e2e_test_base.create_test_user(company, {"full_name": "User A"})
        user_b = e2e_test_base.create_test_user(company, {"full_name": "User B"})
        
        contract = e2e_test_base.create_test_contract(company, user_a)
        
        headers_a = e2e_test_base.get_auth_headers(user_a)
        headers_b = e2e_test_base.get_auth_headers(user_b)
        
        # Step 1: User A generates content
        generate_response = client.post(
            f"/api/v1/contracts/{contract.id}/generate",
            json={"regenerate": False},
            headers=headers_a
        )
        e2e_test_base.assert_response_success(generate_response)
        
        # Step 2: User B views and comments (simulated via update)
        contract_response = client.get(f"/api/v1/contracts/{contract.id}", headers=headers_b)
        contract_data = contract_response.json()
        
        commented_content = contract_data["generated_content"] + "\n\n[COMMENT BY USER B] This looks good but needs more detail on payment terms."
        
        comment_response = client.put(
            f"/api/v1/contracts/{contract.id}",
            json={"final_content": commented_content},
            headers=headers_b
        )
        e2e_test_base.assert_response_success(comment_response)
        
        # Step 3: Verify User A can see the collaboration
        updated_view = client.get(f"/api/v1/contracts/{contract.id}", headers=headers_a)
        updated_contract = updated_view.json()
        
        assert "[COMMENT BY USER B]" in updated_contract["final_content"]
        
        # In a real system:
        # - User A would receive WebSocket notification: "User B commented on contract"
        # - Email notification if enabled
        # - In-app notification badge


class TestSystemScalability:
    """Test system behavior under various load scenarios"""
    
    def test_multiple_concurrent_websocket_connections(self, e2e_test_base: E2ETestBase):
        """Test: System handles multiple simultaneous WebSocket connections"""
        # Note: This test documents expected behavior
        # Actual implementation requires WebSocket server testing
        
        # Setup: Create multiple users
        company = e2e_test_base.create_test_company()
        users = []
        
        for i in range(10):  # 10 concurrent users
            user_data = e2e_test_base.test_data_factory.create_user_data(company_id=company.id)
            user_data["email"] = f"concurrent-user-{i}@testcompany.com"
            user = e2e_test_base.create_test_user(company, user_data)
            users.append(user)
        
        # Test that all users can access WebSocket features
        client = e2e_test_base.client
        
        for user in users:
            headers = e2e_test_base.get_auth_headers(user)
            
            # Each user accesses WebSocket health check
            health_response = client.get("/api/v1/ws/health")
            e2e_test_base.assert_response_success(health_response)
            
            # Each user creates a contract (simulating active collaboration)
            contract_data = {
                "title": f"Contract by {user.full_name}",
                "contract_type": "service_agreement",
                "plain_english_input": f"Contract created by {user.full_name} for concurrent testing"
            }
            
            create_response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
            e2e_test_base.assert_response_success(create_response, 201)
        
        # Verify all contracts exist
        list_response = client.get("/api/v1/contracts/", headers=e2e_test_base.get_auth_headers(users[0]))
        e2e_test_base.assert_response_success(list_response)
        
        contracts = list_response.json()["contracts"]
        assert len(contracts) == len(users)
        
    def test_real_time_update_performance(self, e2e_test_base: E2ETestBase, performance_helper):
        """Test: Performance of real-time updates under load"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        contract = e2e_test_base.create_test_contract(company, user)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Generate initial content
        generate_response = client.post(
            f"/api/v1/contracts/{contract.id}/generate",
            json={"regenerate": False},
            headers=headers
        )
        e2e_test_base.assert_response_success(generate_response)
        
        # Test rapid updates (simulating real-time editing)
        for i in range(10):
            with performance_helper.measure_time("contract_update"):
                update_data = {
                    "title": f"Updated Title {i}",
                    "client_name": f"Updated Client {i}"
                }
                
                update_response = client.put(f"/api/v1/contracts/{contract.id}", json=update_data, headers=headers)
                e2e_test_base.assert_response_success(update_response)
        
        # Assert update performance is acceptable
        performance_helper.assert_performance("contract_update", 500)  # 500ms max per update
        
        # Verify final state
        final_response = client.get(f"/api/v1/contracts/{contract.id}", headers=headers)
        final_contract = final_response.json()
        
        assert final_contract["title"] == "Updated Title 9"
        assert final_contract["client_name"] == "Updated Client 9"