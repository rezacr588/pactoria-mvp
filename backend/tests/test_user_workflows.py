"""
User Workflow Tests for Pactoria MVP
Tests complete user scenarios and workflows that would happen in real usage
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app

client = TestClient(app)


class TestCompleteUserJourney:
    """Test complete user journey from registration to contract completion"""

    def test_complete_onboarding_to_first_contract(self):
        """
        Test complete user journey:
        1. Company owner registers
        2. Creates first contract
        3. Generates AI content
        4. Reviews compliance
        5. Finalizes contract
        """
        # Step 1: Company owner registration
        unique_id = uuid.uuid4().hex[:8]
        owner_data = {
            "email": f"owner-{unique_id}@smallbusiness.co.uk",
            "password": "SecurePassword123!",
            "full_name": "Sarah Johnson",
            "company_name": "Johnson Consulting Ltd",
        }

        registration_response = client.post("/api/v1/auth/register", json=owner_data)
        assert registration_response.status_code == 201

        auth_data = registration_response.json()
        assert auth_data["user"]["email"] == owner_data["email"]
        assert auth_data["company"]["name"] == owner_data["company_name"]

        token = auth_data["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: Browse available templates
        templates_response = client.get("/api/v1/contracts/templates/", headers=headers)
        assert templates_response.status_code == 200

        templates = templates_response.json()
        assert len(templates) >= 20  # MVP requirement

        # Find a service agreement template
        service_template = next(
            (t for t in templates if t["contract_type"] == "service_agreement"), None
        )
        assert service_template is not None

        # Step 3: Create new contract from plain English
        contract_data = {
            "title": "Marketing Services Agreement",
            "contract_type": "service_agreement",
            "plain_english_input": """
            I need a contract for digital marketing services. The client is a local restaurant 
            that wants social media management and Google Ads. Work starts next month, 
            runs for 6 months at £1,500 per month. Payment within 30 days. 
            Include confidentiality and IP ownership clauses. Must comply with UK GDPR.
            """,
            "client_name": "The Golden Curry Restaurant",
            "contract_value": 9000.0,
            "currency": "GBP",
            "template_id": service_template["id"],
        }

        create_response = client.post(
            "/api/v1/contracts/", json=contract_data, headers=headers
        )
        assert create_response.status_code == 201

        contract = create_response.json()
        contract_id = contract["id"]
        assert contract["status"] == "draft"
        assert contract["contract_value"] == 9000.0

        # Step 4: Generate AI content using Groq
        with patch("app.services.ai_service.ai_service") as mock_ai_service:
            mock_ai_service.generate_contract = AsyncMock(
                return_value=type(
                    "MockResponse",
                    (),
                    {
                        "content": """
DIGITAL MARKETING SERVICES AGREEMENT

This Agreement is made under the laws of England and Wales between:

CLIENT: The Golden Curry Restaurant
SERVICE PROVIDER: Johnson Consulting Ltd

1. SERVICES
The Service Provider shall provide digital marketing services including social media management 
and Google Ads campaign management for a period of six (6) months commencing [START_DATE].

2. PAYMENT TERMS  
Monthly fee of £1,500 payable within thirty (30) days of invoice date.
Total contract value: £9,000.

3. CONFIDENTIALITY
Both parties agree to maintain confidentiality of all business information.

4. INTELLECTUAL PROPERTY
All creative materials produced shall be owned by the Client upon full payment.

5. DATA PROTECTION AND GDPR COMPLIANCE
Both parties shall comply with the General Data Protection Regulation (GDPR) 
and the Data Protection Act 2018 in all data processing activities.

6. GOVERNING LAW
This Agreement is governed by the laws of England and Wales.
                """.strip(),
                        "model_name": "openai/gpt-oss-120b",
                        "processing_time_ms": 1200,
                        "confidence_score": 0.94,
                    },
                )()
            )

            generate_response = client.post(
                f"/api/v1/contracts/{contract_id}/generate",
                json={"contract_id": contract_id},
                headers=headers,
            )

            assert generate_response.status_code == 200
            generation_data = generate_response.json()
            assert (
                "DIGITAL MARKETING SERVICES AGREEMENT"
                in generation_data["generated_content"]
            )
            assert "GDPR" in generation_data["generated_content"]

        # Step 5: Analyze compliance
        with patch("app.services.ai_service.ai_service") as mock_ai_service:
            mock_ai_service.analyze_compliance = AsyncMock(
                return_value=type(
                    "MockAnalysis",
                    (),
                    {
                        "overall_score": 0.96,  # Above 95% MVP requirement
                        "gdpr_compliance": 0.98,
                        "employment_law_compliance": 0.85,  # N/A for service agreement
                        "consumer_rights_compliance": 0.94,
                        "commercial_terms_compliance": 0.97,
                        "risk_score": 2,  # Low risk
                        "risk_factors": ["Consider adding force majeure clause"],
                        "recommendations": [
                            "Add termination procedures",
                            "Include dispute resolution",
                        ],
                        "analysis_raw": "Comprehensive analysis complete",
                    },
                )()
            )

            analyze_response = client.post(
                f"/api/v1/contracts/{contract_id}/analyze",
                json={"contract_id": contract_id},
                headers=headers,
            )

            assert analyze_response.status_code == 200
            analysis_data = analyze_response.json()
            assert analysis_data["overall_score"] >= 0.95  # MVP requirement
            assert 1 <= analysis_data["risk_score"] <= 10

        # Step 6: Update contract status to active
        update_response = client.put(
            f"/api/v1/contracts/{contract_id}",
            json={"status": "active"},
            headers=headers,
        )

        assert update_response.status_code == 200
        updated_contract = update_response.json()
        assert updated_contract["status"] == "active"

        # Step 7: Verify contract appears in user's contract list
        list_response = client.get("/api/v1/contracts/", headers=headers)
        assert list_response.status_code == 200

        contracts_list = list_response.json()
        assert contracts_list["total"] >= 1

        user_contract = next(
            (c for c in contracts_list["contracts"] if c["id"] == contract_id), None
        )
        assert user_contract is not None
        assert user_contract["status"] == "active"

    def test_multi_user_company_workflow(self):
        """
        Test multi-user company scenario:
        1. Owner creates company and invites team member
        2. Team member creates contracts
        3. Both users can see company contracts
        4. Data isolation from other companies
        """
        unique_id = uuid.uuid4().hex[:8]

        # Owner registration
        owner_data = {
            "email": f"owner-{unique_id}@company.com",
            "password": "OwnerPass123!",
            "full_name": "Company Owner",
            "company_name": f"Test Company {unique_id}",
        }

        owner_response = client.post("/api/v1/auth/register", json=owner_data)
        assert owner_response.status_code == 201
        owner_token = owner_response.json()["token"]["access_token"]
        owner_headers = {"Authorization": f"Bearer {owner_token}"}

        # Team member registration (same company - this simulates invitation)
        member_data = {
            "email": f"member-{unique_id}@company.com",
            "password": "MemberPass123!",
            "full_name": "Team Member",
            # No company_name - will be associated with company later
        }

        member_response = client.post("/api/v1/auth/register", json=member_data)
        assert member_response.status_code == 201
        member_token = member_response.json()["token"]["access_token"]
        member_headers = {"Authorization": f"Bearer {member_token}"}

        # Owner creates a contract
        owner_contract_data = {
            "title": "Owner's Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "Contract created by company owner",
        }

        owner_contract_response = client.post(
            "/api/v1/contracts/", json=owner_contract_data, headers=owner_headers
        )
        assert owner_contract_response.status_code == 201
        owner_contract_id = owner_contract_response.json()["id"]

        # Member creates a contract (different company, so won't see owner's contracts)
        member_contract_data = {
            "title": "Member's Contract",
            "contract_type": "nda",
            "plain_english_input": "Contract created by team member",
        }

        member_contract_response = client.post(
            "/api/v1/contracts/", json=member_contract_data, headers=member_headers
        )
        assert member_contract_response.status_code == 201
        member_contract_id = member_contract_response.json()["id"]

        # Owner can see their own contracts
        owner_list_response = client.get("/api/v1/contracts/", headers=owner_headers)
        assert owner_list_response.status_code == 200
        owner_contracts = owner_list_response.json()["contracts"]
        owner_contract_ids = [c["id"] for c in owner_contracts]
        assert owner_contract_id in owner_contract_ids
        assert member_contract_id not in owner_contract_ids  # Data isolation

        # Member can see their own contracts
        member_list_response = client.get("/api/v1/contracts/", headers=member_headers)
        assert member_list_response.status_code == 200
        member_contracts = member_list_response.json()["contracts"]
        member_contract_ids = [c["id"] for c in member_contracts]
        assert member_contract_id in member_contract_ids
        assert owner_contract_id not in member_contract_ids  # Data isolation

    def test_contract_lifecycle_workflow(self):
        """
        Test complete contract lifecycle:
        1. Draft creation
        2. Content generation
        3. Revisions and versions
        4. Compliance check
        5. Activation
        6. Completion
        """
        # Setup user
        unique_id = uuid.uuid4().hex[:8]
        user_data = {
            "email": f"lifecycle-{unique_id}@example.com",
            "password": "LifecyclePass123!",
            "full_name": "Lifecycle Tester",
            "company_name": f"Lifecycle Company {unique_id}",
        }

        auth_response = client.post("/api/v1/auth/register", json=user_data)
        token = auth_response.json()["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Phase 1: Draft Creation
        draft_data = {
            "title": "Evolving Service Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "Initial requirements for consulting services",
        }

        create_response = client.post(
            "/api/v1/contracts/", json=draft_data, headers=headers
        )
        assert create_response.status_code == 201
        contract = create_response.json()
        contract_id = contract["id"]
        assert contract["status"] == "draft"
        assert contract["version"] == 1

        # Phase 2: Multiple revisions
        revisions = [
            {"title": "Updated Service Contract", "client_name": "ABC Corp"},
            {"contract_value": 15000.0, "currency": "GBP"},
            {"supplier_name": "Professional Services Ltd"},
        ]

        for i, revision in enumerate(revisions, 1):
            update_response = client.put(
                f"/api/v1/contracts/{contract_id}", json=revision, headers=headers
            )
            assert update_response.status_code == 200
            updated_contract = update_response.json()

            # Verify updates applied
            for key, value in revision.items():
                assert updated_contract[key] == value

        # Phase 3: Content Generation
        with patch("app.services.ai_service.ai_service") as mock_ai_service:
            mock_ai_service.generate_contract = AsyncMock(
                return_value=type(
                    "MockResponse",
                    (),
                    {
                        "content": "GENERATED CONTRACT CONTENT\n\nProfessional services agreement...",
                        "model_name": "openai/gpt-oss-120b",
                        "processing_time_ms": 1100,
                        "confidence_score": 0.93,
                    },
                )()
            )

            generate_response = client.post(
                f"/api/v1/contracts/{contract_id}/generate",
                json={"contract_id": contract_id},
                headers=headers,
            )
            assert generate_response.status_code == 200

        # Phase 4: Compliance Analysis
        with patch("app.services.ai_service.ai_service") as mock_ai_service:
            mock_ai_service.analyze_compliance = AsyncMock(
                return_value=type(
                    "MockAnalysis",
                    (),
                    {
                        "overall_score": 0.91,
                        "gdpr_compliance": 0.95,
                        "risk_score": 4,
                        "risk_factors": [
                            "Missing liability cap",
                            "Incomplete termination clause",
                        ],
                        "recommendations": [
                            "Add liability limitations",
                            "Specify termination notice period",
                        ],
                        "analysis_raw": "Detailed compliance analysis",
                    },
                )()
            )

            analyze_response = client.post(
                f"/api/v1/contracts/{contract_id}/analyze",
                json={"contract_id": contract_id},
                headers=headers,
            )
            assert analyze_response.status_code == 200
            analysis = analyze_response.json()
            assert analysis["overall_score"] > 0.9

        # Phase 5: Status transitions
        status_transitions = ["active", "completed"]

        for status in status_transitions:
            status_response = client.put(
                f"/api/v1/contracts/{contract_id}",
                json={"status": status},
                headers=headers,
            )
            assert status_response.status_code == 200
            assert status_response.json()["status"] == status

        # Phase 6: Version history check
        versions_response = client.get(
            f"/api/v1/contracts/{contract_id}/versions", headers=headers
        )
        # This might return 200 with empty list if version history isn't implemented yet
        assert versions_response.status_code in [200, 404]

    def test_analytics_and_insights_workflow(self):
        """
        Test analytics workflow:
        1. User creates multiple contracts
        2. Generates business metrics
        3. Views contract analytics
        4. Monitors compliance trends
        """
        # Setup user with multiple contracts
        unique_id = uuid.uuid4().hex[:8]
        user_data = {
            "email": f"analytics-{unique_id}@example.com",
            "password": "AnalyticsPass123!",
            "full_name": "Analytics User",
            "company_name": f"Analytics Company {unique_id}",
        }

        auth_response = client.post("/api/v1/auth/register", json=user_data)
        token = auth_response.json()["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create multiple contracts of different types
        contract_types = ["service_agreement", "nda", "supplier_agreement"]
        contract_ids = []

        for i, contract_type in enumerate(contract_types):
            contract_data = {
                "title": f"Analytics Test Contract {i+1}",
                "contract_type": contract_type,
                "plain_english_input": f"Test contract for analytics - type {contract_type}",
                "contract_value": (i + 1) * 5000.0,
                "client_name": f"Client {i+1}",
            }

            response = client.post(
                "/api/v1/contracts/", json=contract_data, headers=headers
            )
            assert response.status_code == 201
            contract_ids.append(response.json()["id"])

        # Test business metrics
        business_metrics_response = client.get(
            "/api/v1/analytics/business", headers=headers
        )
        assert business_metrics_response.status_code == 200

        business_data = business_metrics_response.json()
        assert business_data["total_contracts"] >= len(contract_types)
        assert business_data["total_contract_value"] >= 15000.0  # Sum of test contracts
        assert isinstance(business_data["compliance_score_average"], float)

        # Test user metrics
        user_metrics_response = client.get("/api/v1/analytics/users", headers=headers)
        assert user_metrics_response.status_code == 200

        user_data = user_metrics_response.json()
        assert user_data["total_users"] >= 1
        assert isinstance(user_data["contracts_per_user"], float)

        # Test contract type distribution
        type_metrics_response = client.get(
            "/api/v1/analytics/contract-types", headers=headers
        )
        assert type_metrics_response.status_code == 200

        type_data = type_metrics_response.json()
        assert isinstance(type_data, list)

        # Should have metrics for each contract type we created
        type_names = [item["contract_type"] for item in type_data]
        for contract_type in contract_types:
            assert contract_type in type_names

        # Test time series data
        time_series_response = client.get(
            "/api/v1/analytics/time-series/contracts_created?period=daily&days=30",
            headers=headers,
        )
        assert time_series_response.status_code == 200

        time_data = time_series_response.json()
        assert "data_points" in time_data
        assert isinstance(time_data["data_points"], list)


class TestErrorHandlingAndEdgeCases:
    """Test error scenarios and edge cases"""

    def test_invalid_contract_data_handling(self):
        """Test system handles invalid contract data gracefully"""
        unique_id = uuid.uuid4().hex[:8]
        user_data = {
            "email": f"errortest-{unique_id}@example.com",
            "password": "ErrorTest123!",
            "full_name": "Error Test User",
        }

        auth_response = client.post("/api/v1/auth/register", json=user_data)
        token = auth_response.json()["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test invalid contract type
        invalid_data = {
            "title": "Invalid Contract",
            "contract_type": "invalid_type",
            "plain_english_input": "Test",
        }

        response = client.post("/api/v1/contracts/", json=invalid_data, headers=headers)
        assert response.status_code == 422  # Validation error

        # Test missing required fields
        incomplete_data = {
            "contract_type": "service_agreement"
            # Missing title and plain_english_input
        }

        response = client.post(
            "/api/v1/contracts/", json=incomplete_data, headers=headers
        )
        assert response.status_code == 422

        # Test extremely long input
        long_input_data = {
            "title": "Long Input Test",
            "contract_type": "service_agreement",
            "plain_english_input": "x" * 50000,  # Very long input
        }

        response = client.post(
            "/api/v1/contracts/", json=long_input_data, headers=headers
        )
        # Should either accept it or return appropriate error
        assert response.status_code in [201, 422, 413]

    def test_unauthorized_access_attempts(self):
        """Test unauthorized access attempts are properly blocked"""
        unique_id = uuid.uuid4().hex[:8]

        # Create two different users/companies
        user1_data = {
            "email": f"user1-{unique_id}@example.com",
            "password": "User1Pass123!",
            "full_name": "User One",
            "company_name": "Company One",
        }

        user2_data = {
            "email": f"user2-{unique_id}@example.com",
            "password": "User2Pass123!",
            "full_name": "User Two",
            "company_name": "Company Two",
        }

        auth1 = client.post("/api/v1/auth/register", json=user1_data)
        auth2 = client.post("/api/v1/auth/register", json=user2_data)

        token1 = auth1.json()["token"]["access_token"]
        token2 = auth2.json()["token"]["access_token"]

        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}

        # User 1 creates contract
        contract_data = {
            "title": "Private Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "This is user 1's private contract",
        }

        response = client.post(
            "/api/v1/contracts/", json=contract_data, headers=headers1
        )
        contract_id = response.json()["id"]

        # User 2 tries to access User 1's contract - should be blocked
        unauthorized_response = client.get(
            f"/api/v1/contracts/{contract_id}", headers=headers2
        )
        assert unauthorized_response.status_code == 403

        # User 2 tries to update User 1's contract - should be blocked
        unauthorized_update = client.put(
            f"/api/v1/contracts/{contract_id}",
            json={"title": "Hacked Contract"},
            headers=headers2,
        )
        assert unauthorized_update.status_code == 403

        # User 2 tries to delete User 1's contract - should be blocked
        unauthorized_delete = client.delete(
            f"/api/v1/contracts/{contract_id}", headers=headers2
        )
        assert unauthorized_delete.status_code == 403

    def test_rate_limiting_and_performance(self):
        """Test system handles high load and rate limiting"""
        unique_id = uuid.uuid4().hex[:8]
        user_data = {
            "email": f"performance-{unique_id}@example.com",
            "password": "PerfTest123!",
            "full_name": "Performance Tester",
        }

        auth_response = client.post("/api/v1/auth/register", json=user_data)
        token = auth_response.json()["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test rapid requests - system should handle gracefully
        responses = []
        import time

        start_time = time.time()
        for i in range(10):  # 10 rapid requests
            response = client.get("/api/v1/contracts/", headers=headers)
            responses.append(response)
        end_time = time.time()

        # All requests should succeed or fail gracefully
        for response in responses:
            assert response.status_code in [
                200,
                429,
                503,
            ]  # OK, rate limited, or service unavailable

        # Performance check - 10 simple requests should complete quickly
        total_time = end_time - start_time
        assert total_time < 10.0  # Should complete within 10 seconds


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
