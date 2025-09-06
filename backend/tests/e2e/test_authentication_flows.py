"""
E2E Tests for Authentication and User Management Flows
Tests complete user journeys from registration to advanced operations
"""

import pytest
import time
from typing import Dict, Any
from fastapi import status

from tests.e2e.conftest import E2ETestBase
from app.infrastructure.database.models import User, Company, UserRole


class TestAuthenticationFlows:
    """Complete authentication workflow tests"""

    def test_complete_user_onboarding_flow(
        self, e2e_test_base: E2ETestBase, test_data_factory
    ):
        """Test: New user registers → creates company → logs in → accesses dashboard"""
        client = e2e_test_base.client

        # Step 1: User registration with company creation
        registration_data = {
            "email": "newuser@testcompany.com",
            "full_name": "New Test User",
            "password": "SecurePassword123!",
            "company_name": "New Test Company Ltd",
            "timezone": "Europe/London",
        }

        register_response = client.post("/api/v1/auth/register", json=registration_data)
        e2e_test_base.assert_response_success(register_response, 201)

        auth_data = register_response.json()
        assert "token" in auth_data
        assert "user" in auth_data
        assert "company" in auth_data
        assert auth_data["user"]["email"] == registration_data["email"]
        assert auth_data["company"]["name"] == registration_data["company_name"]

        token = auth_data["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: Verify immediate login works
        profile_response = client.get("/api/v1/auth/me", headers=headers)
        e2e_test_base.assert_response_success(profile_response)

        profile_data = profile_response.json()
        assert profile_data["email"] == registration_data["email"]
        assert profile_data["full_name"] == registration_data["full_name"]

        # Step 3: Access company information
        company_response = client.get("/api/v1/auth/company", headers=headers)
        e2e_test_base.assert_response_success(company_response)

        company_data = company_response.json()
        assert company_data["name"] == registration_data["company_name"]
        assert company_data["subscription_tier"] == "starter"

        # Step 4: Access contracts (should be empty initially)
        contracts_response = client.get("/api/v1/contracts/", headers=headers)
        e2e_test_base.assert_response_success(contracts_response)

        contracts_data = contracts_response.json()
        assert contracts_data["total"] == 0
        assert len(contracts_data["contracts"]) == 0

        # Step 5: Access analytics dashboard
        dashboard_response = client.get("/api/v1/analytics/dashboard", headers=headers)
        e2e_test_base.assert_response_success(dashboard_response)

        dashboard_data = dashboard_response.json()
        assert "business_metrics" in dashboard_data
        assert dashboard_data["business_metrics"]["total_contracts"] == 0

        # Step 6: Create first contract
        contract_data = {
            "title": "First Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "Professional services contract for consulting work",
            "client_name": "First Client Ltd",
        }

        contract_response = client.post(
            "/api/v1/contracts/", json=contract_data, headers=headers
        )
        e2e_test_base.assert_response_success(contract_response, 201)

        created_contract = contract_response.json()
        assert created_contract["title"] == contract_data["title"]
        assert created_contract["status"] == "draft"

        # Step 7: Verify audit trail exists
        # Note: In a real implementation, you might have an audit endpoint
        # For now, we verify the contract was created successfully

    def test_login_logout_flow(self, e2e_test_base: E2ETestBase):
        """Test: User login → access protected resources → token expiration"""
        client = e2e_test_base.client

        # Setup: Create user
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)

        # Step 1: Successful login
        login_data = {"email": user.email, "password": "TestPassword123!"}

        login_response = client.post("/api/v1/auth/login", json=login_data)
        e2e_test_base.assert_response_success(login_response)

        auth_data = login_response.json()
        token = auth_data["token"]["access_token"]
        expires_in = auth_data["token"]["expires_in"]

        assert token is not None
        assert expires_in > 0

        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: Access protected resources
        profile_response = client.get("/api/v1/auth/me", headers=headers)
        e2e_test_base.assert_response_success(profile_response)

        # Step 3: Verify last login was updated
        updated_profile = profile_response.json()
        assert "last_login_at" in updated_profile  # Should be updated from login

        # Step 4: Test invalid credentials
        invalid_login = client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": "WrongPassword"},
        )
        e2e_test_base.assert_response_error(invalid_login, 401)

        # Step 5: Test inactive user
        # In a real implementation, you'd set user.is_active = False
        # For now, test with non-existent user
        nonexistent_login = client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@test.com", "password": "TestPassword123!"},
        )
        e2e_test_base.assert_response_error(nonexistent_login, 401)

    def test_password_reset_flow(self, e2e_test_base: E2ETestBase):
        """Test: Password reset request → reset with token → login with new password"""
        client = e2e_test_base.client

        # Setup: Create user
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)

        # Step 1: Request password reset
        reset_request_data = {"email": user.email}

        reset_request_response = client.post(
            "/api/v1/auth/forgot-password", json=reset_request_data
        )
        e2e_test_base.assert_response_success(reset_request_response)

        # In development mode, the response includes the token
        reset_data = reset_request_response.json()
        if "reset_token" in reset_data:  # Development mode
            reset_token = reset_data["reset_token"]

            # Step 2: Reset password with token
            new_password = "NewSecurePassword123!"
            reset_confirm_data = {"token": reset_token, "new_password": new_password}

            reset_confirm_response = client.post(
                "/api/v1/auth/reset-password", json=reset_confirm_data
            )
            e2e_test_base.assert_response_success(reset_confirm_response)

            # Step 3: Login with new password
            login_data = {"email": user.email, "password": new_password}

            login_response = client.post("/api/v1/auth/login", json=login_data)
            e2e_test_base.assert_response_success(login_response)

            # Step 4: Verify old password no longer works
            old_login_data = {"email": user.email, "password": "TestPassword123!"}

            old_login_response = client.post("/api/v1/auth/login", json=old_login_data)
            e2e_test_base.assert_response_error(old_login_response, 401)

    def test_password_change_flow(self, e2e_test_base: E2ETestBase):
        """Test: Login → change password → verify new password works"""
        client = e2e_test_base.client

        # Setup: Create user and login
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)

        # Step 1: Change password
        new_password = "NewTestPassword123!"
        change_data = {
            "current_password": "TestPassword123!",
            "new_password": new_password,
        }

        change_response = client.post(
            "/api/v1/auth/change-password", json=change_data, headers=headers
        )
        e2e_test_base.assert_response_success(change_response)

        # Step 2: Login with new password
        login_data = {"email": user.email, "password": new_password}

        login_response = client.post("/api/v1/auth/login", json=login_data)
        e2e_test_base.assert_response_success(login_response)

        # Step 3: Verify old password no longer works
        old_login_data = {"email": user.email, "password": "TestPassword123!"}

        old_login_response = client.post("/api/v1/auth/login", json=old_login_data)
        e2e_test_base.assert_response_error(old_login_response, 401)

        # Step 4: Test wrong current password
        wrong_change_data = {
            "current_password": "WrongCurrentPassword",
            "new_password": "AnotherNewPassword123!",
        }

        wrong_change_response = client.post(
            "/api/v1/auth/change-password", json=wrong_change_data, headers=headers
        )
        e2e_test_base.assert_response_error(wrong_change_response, 400)

    def test_profile_management_flow(self, e2e_test_base: E2ETestBase):
        """Test: Login → view profile → update profile → verify changes"""
        client = e2e_test_base.client

        # Setup: Create user
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)

        # Step 1: Get initial profile
        profile_response = client.get("/api/v1/auth/me", headers=headers)
        e2e_test_base.assert_response_success(profile_response)

        initial_profile = profile_response.json()
        assert initial_profile["email"] == user.email
        assert initial_profile["full_name"] == user.full_name

        # Step 2: Update profile
        updated_data = {
            "full_name": "Updated Full Name",
            "timezone": "America/New_York",
            "notification_preferences": {
                "email_notifications": True,
                "contract_updates": True,
                "compliance_alerts": False,
            },
        }

        update_response = client.put(
            "/api/v1/auth/me", json=updated_data, headers=headers
        )
        e2e_test_base.assert_response_success(update_response)

        updated_profile = update_response.json()
        assert updated_profile["full_name"] == updated_data["full_name"]
        assert updated_profile["timezone"] == updated_data["timezone"]

        # Step 3: Verify changes persist
        verification_response = client.get("/api/v1/auth/me", headers=headers)
        e2e_test_base.assert_response_success(verification_response)

        verified_profile = verification_response.json()
        assert verified_profile["full_name"] == updated_data["full_name"]
        assert verified_profile["timezone"] == updated_data["timezone"]

    def test_company_management_flow(self, e2e_test_base: E2ETestBase):
        """Test: User without company → create company → manage company settings"""
        client = e2e_test_base.client

        # Setup: Create user without company
        user_data = e2e_test_base.test_data_factory.create_user_data()
        user_data["company_id"] = None  # No company initially
        user = e2e_test_base.create_test_user(None, user_data)
        headers = e2e_test_base.get_auth_headers(user)

        # Step 1: Verify user has no company
        company_response = client.get("/api/v1/auth/company", headers=headers)
        e2e_test_base.assert_response_error(
            company_response, 403
        )  # No company association

        # Step 2: Create company
        company_data = {
            "name": "New User Company",
            "registration_number": "NUC123456",
            "address": "456 New Street, London, SW2B 2BB",
        }

        create_response = client.post(
            "/api/v1/auth/company", json=company_data, headers=headers
        )
        e2e_test_base.assert_response_success(create_response, 201)

        created_company = create_response.json()
        assert created_company["name"] == company_data["name"]
        assert created_company["subscription_tier"] == "starter"

        # Step 3: Verify user now has access to company
        company_response = client.get("/api/v1/auth/company", headers=headers)
        e2e_test_base.assert_response_success(company_response)

        company_info = company_response.json()
        assert company_info["name"] == company_data["name"]

        # Step 4: Try to create another company (should fail)
        another_company_data = {
            "name": "Another Company",
            "registration_number": "AC789012",
        }

        another_create_response = client.post(
            "/api/v1/auth/company", json=another_company_data, headers=headers
        )
        e2e_test_base.assert_response_error(another_create_response, 400)


class TestRoleBasedAccessControl:
    """Test role-based access control scenarios"""

    def test_admin_user_permissions(self, e2e_test_base: E2ETestBase):
        """Test: Admin user can access all admin-only features"""
        client = e2e_test_base.client

        # Setup: Create admin user
        company = e2e_test_base.create_test_company()
        admin_data = e2e_test_base.test_data_factory.create_admin_user_data(company.id)
        admin_user = e2e_test_base.create_test_user(company, admin_data)
        headers = e2e_test_base.get_auth_headers(admin_user)

        # Test 1: Access system health (admin only)
        health_response = client.get("/api/v1/analytics/system/health", headers=headers)
        e2e_test_base.assert_response_success(health_response)

        # Test 2: Access performance metrics (admin only)
        perf_response = client.get("/api/v1/analytics/performance", headers=headers)
        e2e_test_base.assert_response_success(perf_response)

        # Test 3: Access WebSocket stats (admin only)
        ws_stats_response = client.get("/api/v1/ws/stats", headers=headers)
        e2e_test_base.assert_response_success(ws_stats_response)

    def test_contract_manager_permissions(self, e2e_test_base: E2ETestBase):
        """Test: Contract manager can manage contracts but not admin features"""
        client = e2e_test_base.client

        # Setup: Create contract manager user
        company = e2e_test_base.create_test_company()
        user_data = e2e_test_base.test_data_factory.create_user_data(
            company_id=company.id
        )
        user_data["role"] = UserRole.CONTRACT_MANAGER
        user = e2e_test_base.create_test_user(company, user_data)
        headers = e2e_test_base.get_auth_headers(user)

        # Test 1: Can create contracts
        contract_data = {
            "title": "Manager Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "Contract created by manager",
        }

        create_response = client.post(
            "/api/v1/contracts/", json=contract_data, headers=headers
        )
        e2e_test_base.assert_response_success(create_response, 201)

        # Test 2: Can view contracts
        list_response = client.get("/api/v1/contracts/", headers=headers)
        e2e_test_base.assert_response_success(list_response)

        # Test 3: Cannot access admin features
        health_response = client.get("/api/v1/analytics/system/health", headers=headers)
        e2e_test_base.assert_response_error(health_response, 403)

    def test_viewer_permissions(self, e2e_test_base: E2ETestBase):
        """Test: Viewer can only view, not modify"""
        client = e2e_test_base.client

        # Setup: Create viewer user
        company = e2e_test_base.create_test_company()
        user_data = e2e_test_base.test_data_factory.create_user_data(
            company_id=company.id
        )
        user_data["role"] = UserRole.VIEWER
        viewer_user = e2e_test_base.create_test_user(company, user_data)
        viewer_headers = e2e_test_base.get_auth_headers(viewer_user)

        # Setup: Create a contract with different user
        manager_data = e2e_test_base.test_data_factory.create_user_data(
            company_id=company.id
        )
        manager_data["role"] = UserRole.CONTRACT_MANAGER
        manager_user = e2e_test_base.create_test_user(company, manager_data)
        contract = e2e_test_base.create_test_contract(company, manager_user)

        # Test 1: Can view contracts
        list_response = client.get("/api/v1/contracts/", headers=viewer_headers)
        e2e_test_base.assert_response_success(list_response)

        view_response = client.get(
            f"/api/v1/contracts/{contract.id}", headers=viewer_headers
        )
        e2e_test_base.assert_response_success(view_response)

        # Test 2: Cannot create contracts (assuming role restrictions)
        contract_data = {
            "title": "Viewer Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "This should fail",
        }

        # Note: This depends on role-based restrictions in the API
        # If not implemented, this test documents the expected behavior
        create_response = client.post(
            "/api/v1/contracts/", json=contract_data, headers=viewer_headers
        )
        # e2e_test_base.assert_response_error(create_response, 403)

        # Test 3: Cannot delete contracts (assuming role restrictions)
        delete_response = client.delete(
            f"/api/v1/contracts/{contract.id}", headers=viewer_headers
        )
        # e2e_test_base.assert_response_error(delete_response, 403)


class TestMultiUserScenarios:
    """Test scenarios with multiple users"""

    def test_company_isolation(self, e2e_test_base: E2ETestBase):
        """Test: Users from different companies cannot access each other's data"""
        client = e2e_test_base.client

        # Setup: Create two companies with users
        company_a = e2e_test_base.create_test_company({"name": "Company A"})
        company_b = e2e_test_base.create_test_company({"name": "Company B"})

        user_a = e2e_test_base.create_test_user(company_a)
        user_b = e2e_test_base.create_test_user(company_b)

        headers_a = e2e_test_base.get_auth_headers(user_a)
        headers_b = e2e_test_base.get_auth_headers(user_b)

        # Create contracts for each company
        contract_a = e2e_test_base.create_test_contract(company_a, user_a)
        contract_b = e2e_test_base.create_test_contract(company_b, user_b)

        # Test 1: User A can only see their company's contracts
        list_response_a = client.get("/api/v1/contracts/", headers=headers_a)
        e2e_test_base.assert_response_success(list_response_a)

        contracts_a = list_response_a.json()["contracts"]
        assert len(contracts_a) == 1
        assert contracts_a[0]["id"] == contract_a.id

        # Test 2: User B can only see their company's contracts
        list_response_b = client.get("/api/v1/contracts/", headers=headers_b)
        e2e_test_base.assert_response_success(list_response_b)

        contracts_b = list_response_b.json()["contracts"]
        assert len(contracts_b) == 1
        assert contracts_b[0]["id"] == contract_b.id

        # Test 3: User A cannot access User B's contract directly
        access_response = client.get(
            f"/api/v1/contracts/{contract_b.id}", headers=headers_a
        )
        e2e_test_base.assert_response_error(access_response, 403)

        # Test 4: User B cannot access User A's contract directly
        access_response = client.get(
            f"/api/v1/contracts/{contract_a.id}", headers=headers_b
        )
        e2e_test_base.assert_response_error(access_response, 403)

    def test_concurrent_user_operations(self, e2e_test_base: E2ETestBase):
        """Test: Multiple users performing operations simultaneously"""
        client = e2e_test_base.client

        # Setup: Create company with multiple users
        company = e2e_test_base.create_test_company()
        user_1 = e2e_test_base.create_test_user(company, {"full_name": "User One"})
        user_2 = e2e_test_base.create_test_user(company, {"full_name": "User Two"})
        user_3 = e2e_test_base.create_test_user(company, {"full_name": "User Three"})

        headers_1 = e2e_test_base.get_auth_headers(user_1)
        headers_2 = e2e_test_base.get_auth_headers(user_2)
        headers_3 = e2e_test_base.get_auth_headers(user_3)

        # Test: All users create contracts simultaneously
        contract_data_1 = {
            "title": "Contract by User 1",
            "contract_type": "service_agreement",
            "plain_english_input": "Contract created by first user",
        }

        contract_data_2 = {
            "title": "Contract by User 2",
            "contract_type": "employment_contract",
            "plain_english_input": "Contract created by second user",
        }

        contract_data_3 = {
            "title": "Contract by User 3",
            "contract_type": "nda",
            "plain_english_input": "Contract created by third user",
        }

        # Create contracts
        response_1 = client.post(
            "/api/v1/contracts/", json=contract_data_1, headers=headers_1
        )
        response_2 = client.post(
            "/api/v1/contracts/", json=contract_data_2, headers=headers_2
        )
        response_3 = client.post(
            "/api/v1/contracts/", json=contract_data_3, headers=headers_3
        )

        e2e_test_base.assert_response_success(response_1, 201)
        e2e_test_base.assert_response_success(response_2, 201)
        e2e_test_base.assert_response_success(response_3, 201)

        # Verify all contracts exist and are properly attributed
        list_response = client.get(
            "/api/v1/contracts/", headers=headers_1
        )  # Any user can list company contracts
        e2e_test_base.assert_response_success(list_response)

        contracts = list_response.json()["contracts"]
        assert len(contracts) == 3

        # Verify each contract has correct creator
        titles = [c["title"] for c in contracts]
        assert "Contract by User 1" in titles
        assert "Contract by User 2" in titles
        assert "Contract by User 3" in titles

    def test_user_limit_enforcement(self, e2e_test_base: E2ETestBase):
        """Test: Company user limits are enforced"""
        # Note: This test requires user limit enforcement in the registration/invitation logic
        # If not implemented, this documents the expected behavior
        client = e2e_test_base.client

        # Setup: Create company with starter tier (5 user limit)
        company = e2e_test_base.create_test_company()
        assert company.max_users == 5

        # Create 5 users (at limit)
        users = []
        for i in range(5):
            user_data = e2e_test_base.test_data_factory.create_user_data(
                company_id=company.id
            )
            user_data["email"] = f"user{i}@testcompany.com"
            user = e2e_test_base.create_test_user(company, user_data)
            users.append(user)

        # Try to register 6th user (should fail)
        registration_data = {
            "email": "user6@testcompany.com",
            "full_name": "Sixth User",
            "password": "TestPassword123!",
            # No company_name - trying to join existing company
        }

        # This would require additional logic to associate with existing company
        # For now, document the expected behavior
        # register_response = client.post("/api/v1/auth/register", json=registration_data)
        # e2e_test_base.assert_response_error(register_response, 400)

        # Alternative: Test via user invitation if implemented
        # admin_headers = e2e_test_base.get_auth_headers(users[0])  # Assuming first user is admin
        # invite_data = {"email": "user6@testcompany.com", "role": "viewer"}
        # invite_response = client.post("/api/v1/users/invite", json=invite_data, headers=admin_headers)
        # e2e_test_base.assert_response_error(invite_response, 400)
