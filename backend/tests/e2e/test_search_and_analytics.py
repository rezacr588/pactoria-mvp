"""
E2E Tests for Search, Filtering, and Analytics Features
Tests advanced search capabilities and comprehensive analytics
"""
import pytest
from typing import Dict, Any, List
from datetime import datetime, timedelta

from tests.e2e.conftest import E2ETestBase
from app.infrastructure.database.models import ContractType, ContractStatus


class TestAdvancedSearchFlows:
    """Advanced search and filtering workflow tests"""
    
    def test_comprehensive_contract_search_workflow(self, e2e_test_base: E2ETestBase, performance_helper):
        """Test: Create diverse contracts → search with various filters → verify results"""
        client = e2e_test_base.client
        
        # Setup: Create company and user
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Step 1: Create diverse set of contracts for searching
        test_contracts = [
            {
                "title": "Professional Services Agreement - Tech Corp",
                "contract_type": "service_agreement",
                "plain_english_input": "Consulting services for technology implementation",
                "client_name": "Tech Corporation Ltd",
                "supplier_name": "Professional Services Ltd",
                "contract_value": 75000.0,
                "currency": "GBP",
                "status": "active"
            },
            {
                "title": "Employment Contract - Senior Developer",
                "contract_type": "employment_contract", 
                "plain_english_input": "Full-time employment agreement for senior software developer",
                "client_name": "Tech Corporation Ltd",
                "supplier_name": "John Developer",
                "contract_value": 85000.0,
                "currency": "GBP",
                "status": "active"
            },
            {
                "title": "Non-Disclosure Agreement - Supplier",
                "contract_type": "nda",
                "plain_english_input": "Confidentiality agreement for supplier relationship",
                "client_name": "Manufacturing Corp",
                "supplier_name": "Parts Supplier Ltd",
                "contract_value": 0.0,
                "currency": "GBP",
                "status": "completed"
            },
            {
                "title": "Service Agreement - Marketing Services",
                "contract_type": "service_agreement",
                "plain_english_input": "Marketing and advertising services agreement",
                "client_name": "Small Business Ltd",
                "supplier_name": "Marketing Agency",
                "contract_value": 25000.0,
                "currency": "GBP", 
                "status": "draft"
            },
            {
                "title": "Consultancy Agreement - Business Analysis",
                "contract_type": "consultancy",
                "plain_english_input": "Business analysis and process improvement consultancy",
                "client_name": "Growing Company",
                "supplier_name": "Business Consultants",
                "contract_value": 45000.0,
                "currency": "GBP",
                "status": "active"
            }
        ]
        
        created_contracts = []
        for contract_data in test_contracts:
            with performance_helper.measure_time("contract_creation"):
                create_response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
                e2e_test_base.assert_response_success(create_response, 201)
                created_contracts.append(create_response.json())
        
        # Step 2: Test basic search functionality
        with performance_helper.measure_time("basic_search"):
            search_response = client.get("/api/v1/contracts/?search=Technology", headers=headers)
            e2e_test_base.assert_response_success(search_response)
        
        search_results = search_response.json()
        # Should find contracts with "Technology" or "Tech" in title/client name
        tech_contracts = [c for c in search_results["contracts"] if "Tech" in c["title"] or "Tech" in c["client_name"]]
        assert len(tech_contracts) >= 1
        
        # Step 3: Test contract type filtering
        service_agreements_response = client.get("/api/v1/contracts/?contract_type=service_agreement", headers=headers)
        e2e_test_base.assert_response_success(service_agreements_response)
        
        service_agreements = service_agreements_response.json()
        for contract in service_agreements["contracts"]:
            assert contract["contract_type"] == "service_agreement"
        
        # Step 4: Test status filtering
        active_contracts_response = client.get("/api/v1/contracts/?status=active", headers=headers)
        e2e_test_base.assert_response_success(active_contracts_response)
        
        active_contracts = active_contracts_response.json()
        for contract in active_contracts["contracts"]:
            assert contract["status"] == "active"
        
        # Step 5: Test combined filters
        combined_search_response = client.get(
            "/api/v1/contracts/?contract_type=service_agreement&status=active&search=Professional",
            headers=headers
        )
        e2e_test_base.assert_response_success(combined_search_response)
        
        combined_results = combined_search_response.json()
        for contract in combined_results["contracts"]:
            assert contract["contract_type"] == "service_agreement"
            assert contract["status"] == "active"
            assert "Professional" in contract["title"] or "Professional" in contract["supplier_name"]
        
        # Step 6: Test pagination
        paginated_response = client.get("/api/v1/contracts/?page=1&size=3", headers=headers)
        e2e_test_base.assert_response_success(paginated_response)
        
        paginated_results = paginated_response.json()
        assert paginated_results["size"] == 3
        assert len(paginated_results["contracts"]) <= 3
        assert paginated_results["total"] == len(test_contracts)
        
        # Performance assertions
        performance_helper.assert_performance("contract_creation", 2000)  # 2 seconds per creation
        performance_helper.assert_performance("basic_search", 500)        # 500ms for search
        
    def test_advanced_search_with_complex_filters(self, e2e_test_base: E2ETestBase):
        """Test: Advanced search API with complex filter combinations"""
        client = e2e_test_base.client
        
        # Setup: Create company and user with contracts
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Create contracts with specific values for filtering
        high_value_contract = {
            "title": "High Value Service Agreement",
            "contract_type": "service_agreement", 
            "plain_english_input": "High value consulting project",
            "client_name": "Enterprise Client",
            "contract_value": 100000.0,
            "status": "active"
        }
        
        low_value_contract = {
            "title": "Small Project Agreement",
            "contract_type": "consultancy",
            "plain_english_input": "Small consulting project",
            "client_name": "Small Business",
            "contract_value": 5000.0,
            "status": "draft"
        }
        
        client.post("/api/v1/contracts/", json=high_value_contract, headers=headers)
        client.post("/api/v1/contracts/", json=low_value_contract, headers=headers)
        
        # Step 1: Test advanced search endpoint
        advanced_search_data = {
            "query": "service",
            "filters": {
                "contract_type": ["service_agreement", "consultancy"],
                "status": ["active", "draft"],
                "min_value": 1000.0,
                "max_value": 200000.0
            },
            "sort": [
                {"field": "contract_value", "direction": "desc"}
            ],
            "page": 1,
            "size": 10
        }
        
        advanced_search_response = client.post("/api/v1/search/contracts", json=advanced_search_data, headers=headers)
        e2e_test_base.assert_response_success(advanced_search_response)
        
        search_results = advanced_search_response.json()
        assert "results" in search_results or "contracts" in search_results
        assert search_results["total"] >= 2
        
        # Step 2: Test quick search endpoint
        quick_search_response = client.get(
            "/api/v1/search/contracts/quick?q=service&type=SERVICE_AGREEMENT&page=1&size=5",
            headers=headers
        )
        e2e_test_base.assert_response_success(quick_search_response)
        
        quick_results = quick_search_response.json()
        for contract in quick_results.get("contracts", quick_results.get("results", [])):
            if "contract_type" in contract:
                assert contract["contract_type"] in ["service_agreement", "SERVICE_AGREEMENT"]
        
        # Step 3: Test search suggestions
        suggestions_response = client.get("/api/v1/search/suggestions/contracts?q=serv&limit=5", headers=headers)
        e2e_test_base.assert_response_success(suggestions_response)
        
        suggestions = suggestions_response.json()
        assert "suggestions" in suggestions
        assert len(suggestions["suggestions"]) <= 5
        
        # Step 4: Test faceted search
        facets_response = client.get("/api/v1/search/facets/contracts", headers=headers)
        e2e_test_base.assert_response_success(facets_response)
        
        facets = facets_response.json()
        assert "facets" in facets
        facets_data = facets["facets"]
        assert "status" in facets_data
        assert "contract_type" in facets_data
        
    def test_user_and_template_search(self, e2e_test_base: E2ETestBase):
        """Test: Search across users and templates"""
        client = e2e_test_base.client
        
        # Setup: Create company with multiple users and templates
        company = e2e_test_base.create_test_company()
        
        # Create users with different roles and departments
        admin_user = e2e_test_base.create_test_user(company, {
            "full_name": "Admin User",
            "email": "admin@testcompany.com",
            "role": "admin",
            "department": "Management"
        })
        
        legal_user = e2e_test_base.create_test_user(company, {
            "full_name": "Legal Reviewer", 
            "email": "legal@testcompany.com",
            "role": "legal_reviewer",
            "department": "Legal"
        })
        
        manager_user = e2e_test_base.create_test_user(company, {
            "full_name": "Contract Manager",
            "email": "manager@testcompany.com", 
            "role": "contract_manager",
            "department": "Operations"
        })
        
        admin_headers = e2e_test_base.get_auth_headers(admin_user)
        
        # Create templates
        template_1 = e2e_test_base.create_test_template({
            "name": "Professional Services Template",
            "category": "professional_services",
            "contract_type": ContractType.SERVICE_AGREEMENT
        })
        
        template_2 = e2e_test_base.create_test_template({
            "name": "Employment Contract Template",
            "category": "employment",
            "contract_type": ContractType.EMPLOYMENT_CONTRACT
        })
        
        # Step 1: Search users
        user_search_data = {
            "query": "legal",
            "filters": {
                "role": ["legal_reviewer"],
                "department": "Legal"
            },
            "page": 1,
            "size": 10
        }
        
        user_search_response = client.post("/api/v1/search/users", json=user_search_data, headers=admin_headers)
        e2e_test_base.assert_response_success(user_search_response)
        
        user_results = user_search_response.json()
        assert user_results["total"] >= 1
        
        found_users = user_results.get("users", user_results.get("results", []))
        legal_users = [u for u in found_users if "Legal" in u.get("full_name", "") or u.get("department") == "Legal"]
        assert len(legal_users) >= 1
        
        # Step 2: Search templates
        template_search_data = {
            "query": "professional",
            "filters": {
                "contract_type": ["service_agreement"],
                "category": "professional_services"
            },
            "page": 1,
            "size": 10
        }
        
        template_search_response = client.post("/api/v1/search/templates", json=template_search_data, headers=admin_headers)
        e2e_test_base.assert_response_success(template_search_response)
        
        template_results = template_search_response.json()
        assert template_results["total"] >= 1
        
        found_templates = template_results.get("templates", template_results.get("results", []))
        professional_templates = [t for t in found_templates if "Professional" in t.get("name", "")]
        assert len(professional_templates) >= 1


class TestAnalyticsWorkflows:
    """Comprehensive analytics and reporting workflow tests"""
    
    def test_complete_dashboard_analytics_workflow(self, e2e_test_base: E2ETestBase, performance_helper):
        """Test: Create data → access all analytics endpoints → verify metrics"""
        client = e2e_test_base.client
        
        # Setup: Create company with data
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Step 1: Create diverse contracts for analytics
        contract_scenarios = [
            {"type": "service_agreement", "value": 50000, "status": "active"},
            {"type": "employment_contract", "value": 75000, "status": "active"},
            {"type": "nda", "value": 0, "status": "completed"},
            {"type": "service_agreement", "value": 25000, "status": "draft"},
            {"type": "consultancy", "value": 35000, "status": "active"},
        ]
        
        created_contracts = []
        for i, scenario in enumerate(contract_scenarios):
            contract_data = {
                "title": f"Analytics Contract {i+1}",
                "contract_type": scenario["type"],
                "plain_english_input": f"Contract for analytics testing - {scenario['type']}",
                "client_name": f"Client {i+1}",
                "contract_value": scenario["value"],
                "status": scenario["status"]
            }
            
            create_response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
            e2e_test_base.assert_response_success(create_response, 201)
            created_contracts.append(create_response.json())
        
        # Generate AI content for some contracts to create analytics data
        for contract in created_contracts[:3]:
            generate_response = client.post(
                f"/api/v1/contracts/{contract['id']}/generate",
                json={"regenerate": False},
                headers=headers
            )
            e2e_test_base.assert_response_success(generate_response)
            
            # Analyze compliance for analytics
            analyze_response = client.post(
                f"/api/v1/contracts/{contract['id']}/analyze",
                json={"force_reanalysis": False},
                headers=headers
            )
            e2e_test_base.assert_response_success(analyze_response)
        
        # Step 2: Test comprehensive dashboard analytics
        with performance_helper.measure_time("dashboard_analytics"):
            dashboard_response = client.get("/api/v1/analytics/dashboard", headers=headers)
            e2e_test_base.assert_response_success(dashboard_response)
        
        dashboard_data = dashboard_response.json()
        
        # Verify dashboard structure and data
        assert "business_metrics" in dashboard_data
        assert "user_metrics" in dashboard_data
        assert "contract_types" in dashboard_data
        assert "compliance_metrics" in dashboard_data
        assert "summary" in dashboard_data
        
        business_metrics = dashboard_data["business_metrics"]
        assert business_metrics["total_contracts"] == len(contract_scenarios)
        assert business_metrics["active_contracts"] == 3  # 3 active contracts
        assert business_metrics["draft_contracts"] == 1   # 1 draft contract
        assert business_metrics["completed_contracts"] == 1  # 1 completed contract
        
        # Step 3: Test individual analytics endpoints
        with performance_helper.measure_time("business_metrics"):
            business_response = client.get("/api/v1/analytics/business", headers=headers)
            e2e_test_base.assert_response_success(business_response)
        
        business_data = business_response.json()
        assert business_data["total_contract_value"] > 0
        assert business_data["average_contract_value"] > 0
        
        # Step 4: Test user metrics
        user_metrics_response = client.get("/api/v1/analytics/users", headers=headers)
        e2e_test_base.assert_response_success(user_metrics_response)
        
        user_metrics = user_metrics_response.json()
        assert user_metrics["total_users"] >= 1
        assert "contracts_per_user" in user_metrics
        assert "most_active_users" in user_metrics
        
        # Step 5: Test contract type metrics
        contract_types_response = client.get("/api/v1/analytics/contract-types", headers=headers)
        e2e_test_base.assert_response_success(contract_types_response)
        
        contract_types = contract_types_response.json()
        assert len(contract_types) >= 4  # service_agreement, employment_contract, nda, consultancy
        
        # Verify service agreements are most common
        service_agreements = [ct for ct in contract_types if ct["contract_type"] == "service_agreement"]
        assert len(service_agreements) == 1
        assert service_agreements[0]["count"] == 2  # 2 service agreements created
        
        # Step 6: Test compliance metrics
        compliance_response = client.get("/api/v1/analytics/compliance", headers=headers)
        e2e_test_base.assert_response_success(compliance_response)
        
        compliance_metrics = compliance_response.json()
        assert "overall_compliance_average" in compliance_metrics
        assert "gdpr_compliance_average" in compliance_metrics
        assert "high_risk_contracts_count" in compliance_metrics
        
        # Performance assertions
        performance_helper.assert_performance("dashboard_analytics", 2000)  # 2 seconds
        performance_helper.assert_performance("business_metrics", 500)      # 500ms
        
    def test_time_series_analytics(self, e2e_test_base: E2ETestBase):
        """Test: Time-based analytics and trends"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Create some contracts for time series data
        for i in range(3):
            contract_data = {
                "title": f"Time Series Contract {i+1}",
                "contract_type": "service_agreement",
                "plain_english_input": f"Contract for time series testing {i+1}",
                "client_name": f"Time Series Client {i+1}",
                "contract_value": 20000 + (i * 10000)
            }
            
            create_response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
            e2e_test_base.assert_response_success(create_response, 201)
        
        # Step 1: Test contracts created time series
        contracts_timeseries_response = client.get(
            "/api/v1/analytics/time-series/contracts_created?period=daily&days=30",
            headers=headers
        )
        e2e_test_base.assert_response_success(contracts_timeseries_response)
        
        contracts_timeseries = contracts_timeseries_response.json()
        assert "data_points" in contracts_timeseries
        assert "total" in contracts_timeseries
        assert "trend_direction" in contracts_timeseries
        assert contracts_timeseries["metric_name"] == "contracts_created"
        
        # Step 2: Test contract value time series
        value_timeseries_response = client.get(
            "/api/v1/analytics/time-series/contract_value?period=weekly&days=90",
            headers=headers
        )
        e2e_test_base.assert_response_success(value_timeseries_response)
        
        value_timeseries = value_timeseries_response.json()
        assert value_timeseries["metric_name"] == "contract_value"
        assert "average" in value_timeseries
        
        # Step 3: Test different time periods
        monthly_response = client.get(
            "/api/v1/analytics/time-series/contracts_created?period=monthly&days=365",
            headers=headers
        )
        e2e_test_base.assert_response_success(monthly_response)
        
        monthly_data = monthly_response.json()
        assert monthly_data["period"] == "monthly"
        
    def test_admin_only_analytics(self, e2e_test_base: E2ETestBase):
        """Test: Admin-only analytics endpoints and permissions"""
        client = e2e_test_base.client
        
        # Setup: Create company with admin and regular user
        company = e2e_test_base.create_test_company()
        
        admin_user = e2e_test_base.create_test_user(company, 
            e2e_test_base.test_data_factory.create_admin_user_data(company.id))
        regular_user = e2e_test_base.create_test_user(company)
        
        admin_headers = e2e_test_base.get_auth_headers(admin_user)
        regular_headers = e2e_test_base.get_auth_headers(regular_user)
        
        # Step 1: Test admin can access system health
        system_health_response = client.get("/api/v1/analytics/system/health", headers=admin_headers)
        e2e_test_base.assert_response_success(system_health_response)
        
        health_data = system_health_response.json()
        assert "uptime_percentage" in health_data
        assert "ai_service_health" in health_data
        assert "database_health" in health_data
        
        # Step 2: Test admin can access performance metrics
        performance_response = client.get("/api/v1/analytics/performance", headers=admin_headers)
        e2e_test_base.assert_response_success(performance_response)
        
        performance_data = performance_response.json()
        assert "ai_generation_average_time_ms" in performance_data
        assert "api_response_times" in performance_data
        assert "success_rates" in performance_data
        
        # Step 3: Test regular user cannot access admin analytics
        regular_health_response = client.get("/api/v1/analytics/system/health", headers=regular_headers)
        e2e_test_base.assert_response_error(regular_health_response, 403)
        
        regular_performance_response = client.get("/api/v1/analytics/performance", headers=regular_headers)
        e2e_test_base.assert_response_error(regular_performance_response, 403)
        
    def test_analytics_with_large_dataset(self, e2e_test_base: E2ETestBase, performance_helper):
        """Test: Analytics performance with larger datasets"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Create larger dataset (50 contracts)
        contract_types = ["service_agreement", "employment_contract", "nda", "consultancy"]
        statuses = ["draft", "active", "completed"]
        
        for i in range(50):
            contract_data = {
                "title": f"Large Dataset Contract {i+1}",
                "contract_type": contract_types[i % len(contract_types)],
                "plain_english_input": f"Large dataset contract {i+1} for performance testing",
                "client_name": f"Client {i+1}",
                "contract_value": 10000 + (i * 1000),
                "status": statuses[i % len(statuses)]
            }
            
            create_response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
            e2e_test_base.assert_response_success(create_response, 201)
        
        # Step 1: Test dashboard performance with large dataset
        with performance_helper.measure_time("large_dataset_dashboard"):
            dashboard_response = client.get("/api/v1/analytics/dashboard", headers=headers)
            e2e_test_base.assert_response_success(dashboard_response)
        
        dashboard_data = dashboard_response.json()
        assert dashboard_data["business_metrics"]["total_contracts"] == 50
        
        # Step 2: Test contract search performance
        with performance_helper.measure_time("large_dataset_search"):
            search_response = client.get("/api/v1/contracts/?page=1&size=20", headers=headers)
            e2e_test_base.assert_response_success(search_response)
        
        search_data = search_response.json()
        assert search_data["total"] == 50
        assert len(search_data["contracts"]) == 20  # Page size
        
        # Step 3: Test complex filtering performance
        with performance_helper.measure_time("large_dataset_filtering"):
            filter_response = client.get(
                "/api/v1/contracts/?contract_type=service_agreement&status=active&search=Dataset",
                headers=headers
            )
            e2e_test_base.assert_response_success(filter_response)
        
        # Performance assertions for large dataset
        performance_helper.assert_performance("large_dataset_dashboard", 3000)   # 3 seconds
        performance_helper.assert_performance("large_dataset_search", 1000)     # 1 second
        performance_helper.assert_performance("large_dataset_filtering", 1500)  # 1.5 seconds
        
    def test_export_analytics_data(self, e2e_test_base: E2ETestBase):
        """Test: Export analytics data in various formats"""
        client = e2e_test_base.client
        
        # Setup: Create company with data
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Create some contracts for export
        for i in range(5):
            contract_data = {
                "title": f"Export Test Contract {i+1}",
                "contract_type": "service_agreement",
                "plain_english_input": f"Contract for export testing {i+1}",
                "client_name": f"Export Client {i+1}",
                "contract_value": 15000 + (i * 5000)
            }
            
            create_response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
            e2e_test_base.assert_response_success(create_response, 201)
        
        # Step 1: Test CSV export
        csv_export_data = {
            "contract_ids": [],  # Export all
            "format": "csv",
            "fields": ["title", "contract_type", "client_name", "contract_value", "status"],
            "include_content": False
        }
        
        csv_export_response = client.post("/api/v1/bulk/contracts/export", json=csv_export_data, headers=headers)
        e2e_test_base.assert_response_success(csv_export_response)
        
        csv_export_result = csv_export_response.json()
        assert "export_id" in csv_export_result or "download_url" in csv_export_result
        
        # Step 2: Test Excel export
        excel_export_data = {
            "contract_ids": [],  # Export all
            "format": "excel",
            "fields": ["title", "contract_type", "created_at", "contract_value"],
            "include_content": False
        }
        
        excel_export_response = client.post("/api/v1/bulk/contracts/export", json=excel_export_data, headers=headers)
        e2e_test_base.assert_response_success(excel_export_response)
        
        # Step 3: Test JSON export with content
        json_export_data = {
            "contract_ids": [],  # Export all
            "format": "json",
            "include_content": True,
            "include_versions": False
        }
        
        json_export_response = client.post("/api/v1/bulk/contracts/export", json=json_export_data, headers=headers)
        e2e_test_base.assert_response_success(json_export_response)
        
        json_export_result = json_export_response.json()
        assert "export_id" in json_export_result or "download_url" in json_export_result
        
    def test_real_time_analytics_updates(self, e2e_test_base: E2ETestBase):
        """Test: Analytics update in real-time as data changes"""
        client = e2e_test_base.client
        
        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)
        
        # Step 1: Get initial analytics
        initial_dashboard = client.get("/api/v1/analytics/dashboard", headers=headers)
        initial_data = initial_dashboard.json()
        initial_contract_count = initial_data["business_metrics"]["total_contracts"]
        
        # Step 2: Create new contract
        contract_data = {
            "title": "Real-time Analytics Test Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "Contract for real-time analytics testing",
            "client_name": "Real-time Client",
            "contract_value": 30000
        }
        
        create_response = client.post("/api/v1/contracts/", json=contract_data, headers=headers)
        e2e_test_base.assert_response_success(create_response, 201)
        
        # Step 3: Verify analytics updated
        updated_dashboard = client.get("/api/v1/analytics/dashboard", headers=headers)
        updated_data = updated_dashboard.json()
        updated_contract_count = updated_data["business_metrics"]["total_contracts"]
        
        assert updated_contract_count == initial_contract_count + 1
        
        # Step 4: Update contract status
        created_contract = create_response.json()
        activate_response = client.put(
            f"/api/v1/contracts/{created_contract['id']}",
            json={"status": "active"},
            headers=headers
        )
        e2e_test_base.assert_response_success(activate_response)
        
        # Step 5: Verify status change reflected in analytics
        final_dashboard = client.get("/api/v1/analytics/dashboard", headers=headers)
        final_data = final_dashboard.json()
        
        assert final_data["business_metrics"]["active_contracts"] >= 1
        
        # In a real-time system:
        # - WebSocket would push analytics updates
        # - Dashboard would update without refresh
        # - Charts and graphs would animate changes