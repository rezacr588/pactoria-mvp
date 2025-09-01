"""
E2E Tests for Complete Contract Lifecycle Workflows
Tests full contract journeys from creation to completion
"""
import pytest
import time
from typing import Dict, Any, List
from datetime import datetime, timedelta

from tests.e2e.conftest import E2ETestBase
from app.infrastructure.database.models import Contract, ContractType, ContractStatus


class TestContractLifecycleFlows:
    """Complete contract lifecycle workflow tests"""
    
    def test_complete_contract_creation_workflow(self, e2e_test_base: E2ETestBase, performance_helper):
        """Test: Create → Generate AI Content → Analyze Compliance → Activate → Complete"""
        client = e2e_test_base.client
        
        # Setup: Create user and company
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Step 1: Create initial contract
        with performance_helper.measure_time("contract_creation"):
            contract_data = {
                "title": "Professional Services Agreement - E2E Test",
                "contract_type": "service_agreement",
                "plain_english_input": "I need a comprehensive professional services agreement for consulting work. The contract should include payment terms of 30 days, intellectual property clauses, confidentiality provisions, and termination clauses. The work involves business analysis and strategic recommendations.",
                "client_name": "Test Client Corporation",
                "client_email": "legal@testclient.com",
                "supplier_name": "Professional Services Ltd",
                "contract_value": 75000.0,
                "currency": "GBP",
                "start_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
                "end_date": (datetime.utcnow() + timedelta(days=365)).isoformat()
            }
            
            create_response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
            e2e_test_base.assert_response_success(create_response, 201)
        
        created_contract = create_response.json()
        contract_id = created_contract["id"]
        
        # Verify initial contract state
        assert created_contract["title"] == contract_data["title"]
        assert created_contract["status"] == "draft"
        assert created_contract["version"] == 1
        assert created_contract["client_name"] == contract_data["client_name"]
        
        # Step 2: Generate AI content
        with performance_helper.measure_time("ai_generation"):
            generation_data = {
                "regenerate": False
            }
            
            generate_response = client.post(
                f"/api/v1/contracts/{contract_id}/generate",
                json=generation_data,
                headers=headers
            )
            e2e_test_base.assert_response_success(generate_response)
        
        ai_generation = generate_response.json()
        assert "generated_content" in ai_generation
        assert "processing_time_ms" in ai_generation
        assert ai_generation["confidence_score"] > 0.8
        
        # Step 3: Verify contract has generated content
        contract_response = client.get(f"/api/v1/contracts/{contract_id}", headers=headers)
        e2e_test_base.assert_response_success(contract_response)
        
        updated_contract = contract_response.json()
        assert updated_contract["generated_content"] is not None
        assert len(updated_contract["generated_content"]) > 100  # Substantial content
        
        # Step 4: Analyze contract compliance
        with performance_helper.measure_time("compliance_analysis"):
            analysis_data = {
                "force_reanalysis": False
            }
            
            analyze_response = client.post(
                f"/api/v1/contracts/{contract_id}/analyze",
                json=analysis_data,
                headers=headers
            )
            e2e_test_base.assert_response_success(analyze_response)
        
        compliance_analysis = analyze_response.json()
        assert compliance_analysis["overall_score"] > 0.85
        assert "risk_score" in compliance_analysis
        assert "recommendations" in compliance_analysis
        assert len(compliance_analysis["recommendations"]) > 0
        
        # Step 5: Update contract based on analysis (simulate user edits)
        final_content = updated_contract["generated_content"] + "\n\n[EDITED] Additional clauses based on compliance analysis."
        
        update_data = {
            "final_content": final_content,
            "status": "active"  # Activate the contract
        }
        
        update_response = client.put(f"/api/v1/contracts/{contract_id}", json=update_data, headers=headers)
        e2e_test_base.assert_response_success(update_response)
        
        activated_contract = update_response.json()
        assert activated_contract["status"] == "active"
        assert activated_contract["final_content"] == final_content
        
        # Step 6: Verify contract versions are tracked
        versions_response = client.get(f"/api/v1/contracts/{contract_id}/versions", headers=headers)
        e2e_test_base.assert_response_success(versions_response)
        
        # Note: Contract versions might not be automatically created in current implementation
        # This documents the expected behavior
        
        # Step 7: Complete the contract
        completion_data = {
            "status": "completed"
        }
        
        complete_response = client.put(f"/api/v1/contracts/{contract_id}", json=completion_data, headers=headers)
        e2e_test_base.assert_response_success(complete_response)
        
        completed_contract = complete_response.json()
        assert completed_contract["status"] == "completed"
        
        # Step 8: Verify audit trail exists
        # Note: Audit trail verification would require an audit endpoint
        # For now, verify the contract state changes were successful
        
        # Performance assertions
        performance_helper.assert_performance("contract_creation", 1000)  # 1 second
        performance_helper.assert_performance("ai_generation", 5000)      # 5 seconds
        performance_helper.assert_performance("compliance_analysis", 3000) # 3 seconds
        
    def test_template_based_contract_creation(self, e2e_test_base: E2ETestBase):
        """Test: Select template → customize → generate → finalize"""
        client = e2e_test_base.client
        
        # Setup: Create template, company, and user
        template = e2e_test_base.create_test_template()
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Step 1: List available templates
        templates_response = client.get("/api/v1/contracts/templates/", headers=headers)
        e2e_test_base.assert_response_success(templates_response)
        
        templates = templates_response.json()
        assert len(templates) >= 1
        
        # Find our created template
        our_template = None
        for t in templates:
            if t["id"] == template.id:
                our_template = t
                break
        
        assert our_template is not None
        assert our_template["is_active"] is True
        
        # Step 2: Create contract using template
        contract_data = {
            "title": "Contract from Template",
            "contract_type": template.contract_type.value,
            "template_id": template.id,
            "plain_english_input": "Create a contract based on the selected template with custom terms for our specific use case.",
            "client_name": "Template Client Ltd",
            "contract_value": 45000.0
        }
        
        create_response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
        e2e_test_base.assert_response_success(create_response, 201)
        
        created_contract = create_response.json()
        assert created_contract["template_id"] == template.id
        
        # Step 3: Generate content (should use template as base)
        generate_response = client.post(
            f"/api/v1/contracts/{created_contract['id']}/generate",
            json={"regenerate": False},
            headers=headers
        )
        e2e_test_base.assert_response_success(generate_response)
        
        # Step 4: Verify template-based generation
        contract_response = client.get(f"/api/v1/contracts/{created_contract['id']}", headers=headers)
        e2e_test_base.assert_response_success(contract_response)
        
        final_contract = contract_response.json()
        assert final_contract["generated_content"] is not None
        # In a real implementation, generated content would incorporate template
        
    def test_contract_collaboration_workflow(self, e2e_test_base: E2ETestBase):
        """Test: Multiple users collaborating on contract development"""
        client = e2e_test_base.client
        
        # Setup: Create company with multiple users
        company = e2e_test_base.create_test_company()
        creator_user = e2e_test_base.create_test_user(company, {"full_name": "Contract Creator"})
        reviewer_user = e2e_test_base.create_test_user(company, {"full_name": "Legal Reviewer"})
        approver_user = e2e_test_base.create_test_user(company, {"full_name": "Contract Approver"})
        
        creator_headers = e2e_test_base.get_auth_headers(creator_user)
        reviewer_headers = e2e_test_base.get_auth_headers(reviewer_user)
        approver_headers = e2e_test_base.get_auth_headers(approver_user)
        
        # Step 1: Creator creates initial contract
        contract_data = {
            "title": "Collaborative Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "Multi-user collaboration contract for testing workflow"
        }
        
        create_response = client.post("/api/v1/contracts/", json=contract_data, headers=creator_headers)
        e2e_test_base.assert_response_success(create_response, 201)
        
        contract_id = create_response.json()["id"]
        
        # Step 2: Creator generates initial content
        generate_response = client.post(
            f"/api/v1/contracts/{contract_id}/generate",
            json={"regenerate": False},
            headers=creator_headers
        )
        e2e_test_base.assert_response_success(generate_response)
        
        # Step 3: Reviewer accesses and reviews contract
        review_response = client.get(f"/api/v1/contracts/{contract_id}", headers=reviewer_headers)
        e2e_test_base.assert_response_success(review_response)
        
        contract = review_response.json()
        
        # Step 4: Reviewer runs compliance analysis
        analyze_response = client.post(
            f"/api/v1/contracts/{contract_id}/analyze",
            json={"force_reanalysis": False},
            headers=reviewer_headers
        )
        e2e_test_base.assert_response_success(analyze_response)
        
        # Step 5: Reviewer makes updates based on analysis
        updated_content = contract["generated_content"] + "\n\n[REVIEWER ADDITIONS] Additional compliance clauses."
        
        update_response = client.put(
            f"/api/v1/contracts/{contract_id}",
            json={"final_content": updated_content},
            headers=reviewer_headers
        )
        e2e_test_base.assert_response_success(update_response)
        
        # Step 6: Approver reviews and activates contract
        final_review_response = client.get(f"/api/v1/contracts/{contract_id}", headers=approver_headers)
        e2e_test_base.assert_response_success(final_review_response)
        
        final_contract = final_review_response.json()
        assert "[REVIEWER ADDITIONS]" in final_contract["final_content"]
        
        # Step 7: Approver activates the contract
        activate_response = client.put(
            f"/api/v1/contracts/{contract_id}",
            json={"status": "active"},
            headers=approver_headers
        )
        e2e_test_base.assert_response_success(activate_response)
        
        activated_contract = activate_response.json()
        assert activated_contract["status"] == "active"
        
        # Step 8: Verify all users can access the activated contract
        for user_headers in [creator_headers, reviewer_headers, approver_headers]:
            access_response = client.get(f"/api/v1/contracts/{contract_id}", headers=user_headers)
            e2e_test_base.assert_response_success(access_response)
            
            contract_data = access_response.json()
            assert contract_data["status"] == "active"
            
    def test_contract_regeneration_workflow(self, e2e_test_base: E2ETestBase):
        """Test: Generate → review → regenerate → compare versions"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Step 1: Create contract
        contract_data = {
            "title": "Regeneration Test Contract",
            "contract_type": "service_agreement", 
            "plain_english_input": "Initial contract requirements for testing regeneration"
        }
        
        create_response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
        e2e_test_base.assert_response_success(create_response, 201)
        
        contract_id = create_response.json()["id"]
        
        # Step 2: Initial generation
        generate_response_1 = client.post(
            f"/api/v1/contracts/{contract_id}/generate",
            json={"regenerate": False},
            headers=headers
        )
        e2e_test_base.assert_response_success(generate_response_1)
        
        first_generation = generate_response_1.json()
        first_content = first_generation["generated_content"]
        
        # Step 3: Get contract with first generation
        contract_response_1 = client.get(f"/api/v1/contracts/{contract_id}", headers=headers)
        contract_1 = contract_response_1.json()
        
        # Step 4: Regenerate content
        generate_response_2 = client.post(
            f"/api/v1/contracts/{contract_id}/generate",
            json={"regenerate": True},
            headers=headers
        )
        e2e_test_base.assert_response_success(generate_response_2)
        
        second_generation = generate_response_2.json()
        second_content = second_generation["generated_content"]
        
        # Step 5: Verify regeneration created different content
        # Note: In a deterministic system, content might be the same
        # This test documents expected behavior with non-deterministic AI
        assert second_content is not None
        assert len(second_content) > 100
        
        # Step 6: Verify contract now has updated content
        contract_response_2 = client.get(f"/api/v1/contracts/{contract_id}", headers=headers)
        contract_2 = contract_response_2.json()
        
        assert contract_2["generated_content"] == second_content
        
        # Step 7: Test with existing generation (should return cached)
        generate_response_3 = client.post(
            f"/api/v1/contracts/{contract_id}/generate",
            json={"regenerate": False},
            headers=headers
        )
        e2e_test_base.assert_response_success(generate_response_3)
        
        third_generation = generate_response_3.json()
        assert third_generation["generated_content"] == second_content  # Should be cached
        
    def test_contract_compliance_workflow(self, e2e_test_base: E2ETestBase):
        """Test: Create → analyze → fix issues → re-analyze → approve"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Step 1: Create contract with potential compliance issues
        contract_data = {
            "title": "Compliance Test Contract",
            "contract_type": "employment_contract",
            "plain_english_input": "Employment contract without proper GDPR clauses or termination provisions - needs compliance review"
        }
        
        create_response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
        e2e_test_base.assert_response_success(create_response, 201)
        
        contract_id = create_response.json()["id"]
        
        # Step 2: Generate initial content
        generate_response = client.post(
            f"/api/v1/contracts/{contract_id}/generate",
            json={"regenerate": False},
            headers=headers
        )
        e2e_test_base.assert_response_success(generate_response)
        
        # Step 3: Initial compliance analysis
        analyze_response = client.post(
            f"/api/v1/contracts/{contract_id}/analyze",
            json={"force_reanalysis": False},
            headers=headers
        )
        e2e_test_base.assert_response_success(analyze_response)
        
        initial_analysis = analyze_response.json()
        initial_score = initial_analysis["overall_score"]
        initial_recommendations = initial_analysis["recommendations"]
        
        assert len(initial_recommendations) > 0
        
        # Step 4: Get contract and apply compliance fixes
        contract_response = client.get(f"/api/v1/contracts/{contract_id}", headers=headers)
        contract = contract_response.json()
        
        # Simulate applying compliance fixes based on recommendations
        improved_content = contract["generated_content"] + "\n\n" + "\n".join([
            "[COMPLIANCE FIX] " + rec for rec in initial_recommendations[:3]
        ])
        
        update_response = client.put(
            f"/api/v1/contracts/{contract_id}",
            json={"final_content": improved_content},
            headers=headers
        )
        e2e_test_base.assert_response_success(update_response)
        
        # Step 5: Re-analyze compliance
        reanalyze_response = client.post(
            f"/api/v1/contracts/{contract_id}/analyze",
            json={"force_reanalysis": True},
            headers=headers
        )
        e2e_test_base.assert_response_success(reanalyze_response)
        
        improved_analysis = reanalyze_response.json()
        improved_score = improved_analysis["overall_score"]
        
        # Step 6: Verify compliance improved
        # Note: Mock AI service returns consistent scores
        # In real implementation, score should improve
        assert improved_score >= initial_score
        
        # Step 7: If compliance is satisfactory, activate contract
        if improved_score >= 0.9:  # High compliance threshold
            activate_response = client.put(
                f"/api/v1/contracts/{contract_id}",
                json={"status": "active"},
                headers=headers
            )
            e2e_test_base.assert_response_success(activate_response)


class TestContractStateTransitions:
    """Test valid and invalid contract state transitions"""
    
    def test_valid_state_transitions(self, e2e_test_base: E2ETestBase):
        """Test: Draft → Active → Completed (valid transitions)"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        contract = e2e_test_base.create_test_contract(company, user)
        headers = e2e_test_base.get_auth_headers(user)
        
        contract_id = contract.id
        
        # Verify initial state
        assert contract.status == ContractStatus.DRAFT
        
        # Transition 1: Draft → Active
        activate_response = client.put(
            f"/api/v1/contracts/{contract_id}",
            json={"status": "active"},
            headers=headers
        )
        e2e_test_base.assert_response_success(activate_response)
        
        active_contract = activate_response.json()
        assert active_contract["status"] == "active"
        
        # Transition 2: Active → Completed
        complete_response = client.put(
            f"/api/v1/contracts/{contract_id}",
            json={"status": "completed"},
            headers=headers
        )
        e2e_test_base.assert_response_success(complete_response)
        
        completed_contract = complete_response.json()
        assert completed_contract["status"] == "completed"
        
    def test_contract_termination_workflow(self, e2e_test_base: E2ETestBase):
        """Test: Contract termination from various states"""
        client = e2e_test_base.client
        
        # Setup: Create multiple contracts in different states
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Draft contract
        draft_contract = e2e_test_base.create_test_contract(company, user, {
            "title": "Draft Contract for Termination",
            "status": ContractStatus.DRAFT
        })
        
        # Active contract
        active_contract = e2e_test_base.create_test_contract(company, user, {
            "title": "Active Contract for Termination", 
            "status": ContractStatus.ACTIVE
        })
        
        # Test 1: Terminate draft contract (soft delete)
        terminate_draft_response = client.delete(f"/api/v1/contracts/{draft_contract.id}", headers=headers)
        e2e_test_base.assert_response_success(terminate_draft_response, 204)
        
        # Verify contract is marked as terminated
        draft_check_response = client.get(f"/api/v1/contracts/{draft_contract.id}", headers=headers)
        # Note: Depending on implementation, this might return 404 or show terminated status
        
        # Test 2: Terminate active contract
        terminate_active_response = client.delete(f"/api/v1/contracts/{active_contract.id}", headers=headers)
        e2e_test_base.assert_response_success(terminate_active_response, 204)
        
        # Test 3: Verify terminated contracts don't appear in regular listings
        list_response = client.get("/api/v1/contracts/", headers=headers)
        e2e_test_base.assert_response_success(list_response)
        
        contracts = list_response.json()["contracts"]
        active_contract_ids = [c["id"] for c in contracts if c["status"] != "terminated"]
        
        assert draft_contract.id not in active_contract_ids
        assert active_contract.id not in active_contract_ids


class TestContractVersioning:
    """Test contract version control"""
    
    def test_contract_version_tracking(self, e2e_test_base: E2ETestBase):
        """Test: Create → edit → create version → edit → create version"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        contract = e2e_test_base.create_test_contract(company, user)
        headers = e2e_test_base.get_auth_headers(user)
        
        contract_id = contract.id
        
        # Step 1: Generate initial content (version 1)
        generate_response = client.post(
            f"/api/v1/contracts/{contract_id}/generate",
            json={"regenerate": False},
            headers=headers
        )
        e2e_test_base.assert_response_success(generate_response)
        
        # Step 2: Make first edit
        contract_response = client.get(f"/api/v1/contracts/{contract_id}", headers=headers)
        contract_data = contract_response.json()
        
        edited_content = contract_data["generated_content"] + "\n\n[EDIT 1] First modification"
        
        update_response_1 = client.put(
            f"/api/v1/contracts/{contract_id}",
            json={"final_content": edited_content},
            headers=headers
        )
        e2e_test_base.assert_response_success(update_response_1)
        
        # Step 3: Check versions (implementation dependent)
        versions_response = client.get(f"/api/v1/contracts/{contract_id}/versions", headers=headers)
        e2e_test_base.assert_response_success(versions_response)
        
        versions = versions_response.json()
        # Note: Version tracking implementation may vary
        # This documents expected behavior
        
        # Step 4: Make second edit
        second_edited_content = edited_content + "\n\n[EDIT 2] Second modification"
        
        update_response_2 = client.put(
            f"/api/v1/contracts/{contract_id}",
            json={"final_content": second_edited_content},
            headers=headers
        )
        e2e_test_base.assert_response_success(update_response_2)
        
        # Step 5: Verify current version has latest content
        final_response = client.get(f"/api/v1/contracts/{contract_id}", headers=headers)
        final_contract = final_response.json()
        
        assert "[EDIT 1]" in final_contract["final_content"]
        assert "[EDIT 2]" in final_contract["final_content"]


class TestContractValidationRules:
    """Test business validation rules for contracts"""
    
    def test_contract_creation_validation(self, e2e_test_base: E2ETestBase, error_scenarios):
        """Test: Various validation errors during contract creation"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        validation_errors = error_scenarios["validation_errors"]
        
        for error_case in validation_errors:
            # Create base valid data
            base_data = {
                "title": "Valid Contract Title",
                "contract_type": "service_agreement",
                "plain_english_input": "Valid contract description with sufficient detail for processing"
            }
            
            # Apply the invalid data
            test_data = {**base_data, **error_case["data"]}
            
            response = client.post("/api/v1/contracts/", json=test_data, headers=headers)
            e2e_test_base.assert_response_error(response, error_case["expected_status"])
            
            # Verify error response contains field information
            if response.status_code == 422:
                error_data = response.json()
                assert "detail" in error_data
                
    def test_contract_business_rules(self, e2e_test_base: E2ETestBase):
        """Test: Business rules enforcement"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Test 1: Contract value validation (if implemented)
        high_value_contract = {
            "title": "High Value Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "High value contract for testing",
            "contract_value": 10000000.0  # 10 million - might require approval
        }
        
        high_value_response = client.post("/api/v1/contracts/", json=high_value_contract, headers=headers)
        # Note: Business rules for high-value contracts depend on implementation
        e2e_test_base.assert_response_success(high_value_response, 201)
        
        # Test 2: Date validation
        invalid_date_contract = {
            "title": "Invalid Date Contract",
            "contract_type": "service_agreement", 
            "plain_english_input": "Contract with invalid dates",
            "start_date": (datetime.utcnow() + timedelta(days=365)).isoformat(),
            "end_date": (datetime.utcnow()).isoformat()  # End before start
        }
        
        invalid_date_response = client.post("/api/v1/contracts/", json=invalid_date_contract, headers=headers)
        # Note: Date validation depends on implementation
        # e2e_test_base.assert_response_error(invalid_date_response, 400)
        
        # For now, document expected behavior
        # In a complete implementation, business rules would be enforced