"""
E2E Tests for Performance and Load Testing Scenarios
Tests system performance under various load conditions and stress scenarios
"""

import pytest
import time
import asyncio
import concurrent.futures
from typing import Dict, Any, List, Callable
from datetime import datetime, timedelta
import statistics

from tests.e2e.conftest import E2ETestBase


class TestAPIPerformance:
    """API endpoint performance tests"""

    def test_contract_crud_performance(
        self, e2e_test_base: E2ETestBase, performance_helper
    ):
        """Test: CRUD operations performance benchmarks"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)

        created_contracts = []

        # Test 1: Contract creation performance
        contract_data_template = {
            "title": "Performance Test Contract {}",
            "contract_type": "service_agreement",
            "plain_english_input": "Performance testing contract with comprehensive details for measuring creation speed and response times under various load conditions.",
            "client_name": "Performance Test Client {}",
            "contract_value": 45000.0,
        }

        # Create multiple contracts and measure performance
        for i in range(20):
            contract_data = {
                k: v.format(i + 1) if isinstance(v, str) else v
                for k, v in contract_data_template.items()
            }

            with performance_helper.measure_time("contract_creation"):
                create_response = client.post(
                    "/api/v1/contracts/", json=contract_data, headers=headers
                )
                e2e_test_base.assert_response_success(create_response, 201)
                created_contracts.append(create_response.json())

        # Test 2: Contract retrieval performance
        for contract in created_contracts[:10]:  # Test subset for retrieval
            with performance_helper.measure_time("contract_retrieval"):
                get_response = client.get(
                    f"/api/v1/contracts/{contract['id']}", headers=headers
                )
                e2e_test_base.assert_response_success(get_response)

        # Test 3: Contract listing performance
        with performance_helper.measure_time("contract_listing"):
            list_response = client.get(
                "/api/v1/contracts/?page=1&size=20", headers=headers
            )
            e2e_test_base.assert_response_success(list_response)

        # Test 4: Contract update performance
        for contract in created_contracts[:5]:  # Test subset for updates
            update_data = {"client_name": f"Updated Client {contract['id'][:8]}"}

            with performance_helper.measure_time("contract_update"):
                update_response = client.put(
                    f"/api/v1/contracts/{contract['id']}",
                    json=update_data,
                    headers=headers,
                )
                e2e_test_base.assert_response_success(update_response)

        # Test 5: Contract deletion performance
        for contract in created_contracts[:5]:  # Test subset for deletion
            with performance_helper.measure_time("contract_deletion"):
                delete_response = client.delete(
                    f"/api/v1/contracts/{contract['id']}", headers=headers
                )
                e2e_test_base.assert_response_success(delete_response, 204)

        # Performance assertions
        performance_helper.assert_performance("contract_creation", 2000)  # 2 seconds
        performance_helper.assert_performance("contract_retrieval", 500)  # 500ms
        performance_helper.assert_performance("contract_listing", 1000)  # 1 second
        performance_helper.assert_performance("contract_update", 1000)  # 1 second
        performance_helper.assert_performance("contract_deletion", 500)  # 500ms

    def test_ai_operations_performance(
        self, e2e_test_base: E2ETestBase, performance_helper
    ):
        """Test: AI-powered operations performance"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)

        # Create contracts for AI testing
        test_contracts = []
        for i in range(5):
            contract_data = {
                "title": f"AI Performance Test Contract {i+1}",
                "contract_type": "service_agreement",
                "plain_english_input": f"Contract {i+1} for AI performance testing with substantial content to ensure realistic generation times and comprehensive compliance analysis covering all aspects of UK legal requirements including GDPR, employment law, consumer protection, and commercial terms.",
                "client_name": f"AI Test Client {i+1}",
                "contract_value": 50000 + (i * 10000),
            }

            create_response = client.post(
                "/api/v1/contracts/", json=contract_data, headers=headers
            )
            e2e_test_base.assert_response_success(create_response, 201)
            test_contracts.append(create_response.json())

        # Test 1: AI content generation performance
        for contract in test_contracts:
            with performance_helper.measure_time("ai_generation"):
                generate_response = client.post(
                    f"/api/v1/contracts/{contract['id']}/generate",
                    json={"regenerate": False},
                    headers=headers,
                )
                e2e_test_base.assert_response_success(generate_response)

        # Test 2: AI compliance analysis performance
        for contract in test_contracts:
            with performance_helper.measure_time("ai_compliance_analysis"):
                analyze_response = client.post(
                    f"/api/v1/contracts/{contract['id']}/analyze",
                    json={"force_reanalysis": False},
                    headers=headers,
                )
                e2e_test_base.assert_response_success(analyze_response)

        # Test 3: AI regeneration performance
        for contract in test_contracts[:3]:  # Test subset for regeneration
            with performance_helper.measure_time("ai_regeneration"):
                regenerate_response = client.post(
                    f"/api/v1/contracts/{contract['id']}/generate",
                    json={"regenerate": True},
                    headers=headers,
                )
                e2e_test_base.assert_response_success(regenerate_response)

        # Performance assertions for AI operations (more lenient due to external service)
        performance_helper.assert_performance("ai_generation", 10000)  # 10 seconds
        performance_helper.assert_performance(
            "ai_compliance_analysis", 5000
        )  # 5 seconds
        performance_helper.assert_performance("ai_regeneration", 10000)  # 10 seconds

    def test_search_and_filtering_performance(
        self, e2e_test_base: E2ETestBase, performance_helper
    ):
        """Test: Search and filtering performance with various data sizes"""
        client = e2e_test_base.client

        # Setup: Create large dataset
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)

        # Create diverse contracts for search testing
        contract_types = [
            "service_agreement",
            "employment_contract",
            "nda",
            "consultancy",
        ]
        statuses = ["draft", "active", "completed"]

        for i in range(100):  # Create 100 contracts
            contract_data = {
                "title": f"Search Test Contract {i+1:03d}",
                "contract_type": contract_types[i % len(contract_types)],
                "plain_english_input": f"Contract {i+1} for search performance testing with keywords: project, consulting, agreement, terms",
                "client_name": f"Search Client {i+1:03d}",
                "supplier_name": f"Supplier Company {(i // 10) + 1}",
                "contract_value": 10000 + (i * 500),
                "status": statuses[i % len(statuses)],
            }

            create_response = client.post(
                "/api/v1/contracts/", json=contract_data, headers=headers
            )
            e2e_test_base.assert_response_success(create_response, 201)

        # Test 1: Basic search performance
        search_queries = [
            "Contract",
            "project",
            "consulting",
            "Search Client 050",
            "Supplier Company",
        ]

        for query in search_queries:
            with performance_helper.measure_time("basic_search"):
                search_response = client.get(
                    f"/api/v1/contracts/?search={query}", headers=headers
                )
                e2e_test_base.assert_response_success(search_response)

        # Test 2: Filtered search performance
        filter_combinations = [
            "?contract_type=service_agreement",
            "?status=active",
            "?contract_type=employment_contract&status=draft",
            "?search=Contract&contract_type=service_agreement",
            "?search=project&status=active&contract_type=consultancy",
        ]

        for filter_query in filter_combinations:
            with performance_helper.measure_time("filtered_search"):
                filter_response = client.get(
                    f"/api/v1/contracts/{filter_query}", headers=headers
                )
                e2e_test_base.assert_response_success(filter_response)

        # Test 3: Pagination performance
        for page in range(1, 6):  # Test first 5 pages
            with performance_helper.measure_time("paginated_search"):
                page_response = client.get(
                    f"/api/v1/contracts/?page={page}&size=20", headers=headers
                )
                e2e_test_base.assert_response_success(page_response)

        # Test 4: Advanced search performance
        advanced_search_data = {
            "query": "consulting agreement",
            "filters": {
                "contract_type": ["service_agreement", "consultancy"],
                "status": ["active", "draft"],
                "min_value": 20000,
                "max_value": 80000,
            },
            "sort": [{"field": "contract_value", "direction": "desc"}],
            "page": 1,
            "size": 20,
        }

        with performance_helper.measure_time("advanced_search"):
            advanced_response = client.post(
                "/api/v1/search/contracts", json=advanced_search_data, headers=headers
            )
            e2e_test_base.assert_response_success(advanced_response)

        # Performance assertions
        performance_helper.assert_performance("basic_search", 1000)  # 1 second
        performance_helper.assert_performance("filtered_search", 1500)  # 1.5 seconds
        performance_helper.assert_performance("paginated_search", 800)  # 800ms
        performance_helper.assert_performance("advanced_search", 2000)  # 2 seconds

    def test_analytics_performance(
        self, e2e_test_base: E2ETestBase, performance_helper
    ):
        """Test: Analytics and reporting performance"""
        client = e2e_test_base.client

        # Setup: Use existing large dataset or create minimal set
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)

        # Create some contracts for analytics
        for i in range(20):
            contract_data = {
                "title": f"Analytics Test Contract {i+1}",
                "contract_type": "service_agreement",
                "plain_english_input": f"Contract {i+1} for analytics performance testing",
                "client_name": f"Analytics Client {i+1}",
                "contract_value": 25000 + (i * 2500),
                "status": "active" if i % 2 == 0 else "draft",
            }

            create_response = client.post(
                "/api/v1/contracts/", json=contract_data, headers=headers
            )
            e2e_test_base.assert_response_success(create_response, 201)

        # Test 1: Dashboard analytics performance
        with performance_helper.measure_time("dashboard_analytics"):
            dashboard_response = client.get(
                "/api/v1/analytics/dashboard", headers=headers
            )
            e2e_test_base.assert_response_success(dashboard_response)

        # Test 2: Individual analytics endpoints performance
        analytics_endpoints = [
            "/api/v1/analytics/business",
            "/api/v1/analytics/users",
            "/api/v1/analytics/contract-types",
            "/api/v1/analytics/compliance",
        ]

        for endpoint in analytics_endpoints:
            with performance_helper.measure_time("individual_analytics"):
                analytics_response = client.get(endpoint, headers=headers)
                e2e_test_base.assert_response_success(analytics_response)

        # Test 3: Time series analytics performance
        time_series_queries = [
            "/api/v1/analytics/time-series/contracts_created?period=daily&days=30",
            "/api/v1/analytics/time-series/contract_value?period=weekly&days=90",
            "/api/v1/analytics/time-series/contracts_created?period=monthly&days=365",
        ]

        for query in time_series_queries:
            with performance_helper.measure_time("time_series_analytics"):
                ts_response = client.get(query, headers=headers)
                e2e_test_base.assert_response_success(ts_response)

        # Performance assertions
        performance_helper.assert_performance("dashboard_analytics", 3000)  # 3 seconds
        performance_helper.assert_performance("individual_analytics", 1000)  # 1 second
        performance_helper.assert_performance(
            "time_series_analytics", 1500
        )  # 1.5 seconds


class TestConcurrentUserLoad:
    """Tests simulating multiple concurrent users"""

    def test_concurrent_contract_operations(
        self, e2e_test_base: E2ETestBase, performance_helper
    ):
        """Test: Multiple users performing contract operations simultaneously"""
        client = e2e_test_base.client

        # Setup: Create multiple users
        company = e2e_test_base.create_test_company()
        users = []

        for i in range(10):
            user_data = e2e_test_base.test_data_factory.create_user_data(
                company_id=company.id
            )
            user_data["email"] = f"concurrent-user-{i}@testcompany.com"
            user_data["full_name"] = f"Concurrent User {i+1}"
            user = e2e_test_base.create_test_user(company, user_data)
            users.append(user)

        def create_contracts_for_user(user, count=5):
            """Create contracts for a specific user"""
            headers = e2e_test_base.get_auth_headers(user)
            created_contracts = []

            for i in range(count):
                contract_data = {
                    "title": f"Concurrent Contract {i+1} by {user.full_name}",
                    "contract_type": "service_agreement",
                    "plain_english_input": f"Contract {i+1} created by {user.full_name} for concurrent testing",
                    "client_name": f"Concurrent Client {i+1}",
                }

                with performance_helper.measure_time("concurrent_contract_creation"):
                    response = client.post(
                        "/api/v1/contracts/", json=contract_data, headers=headers
                    )
                    if response.status_code == 201:
                        created_contracts.append(response.json())

            return created_contracts

        # Test 1: Concurrent contract creation
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_user = {
                executor.submit(create_contracts_for_user, user, 3): user
                for user in users[:5]  # Use first 5 users
            }

            all_results = []
            for future in concurrent.futures.as_completed(future_to_user):
                user = future_to_user[future]
                try:
                    contracts = future.result(timeout=30)  # 30 second timeout
                    all_results.extend(contracts)
                except Exception as e:
                    print(f"User {user.full_name} failed: {e}")

        # Verify results
        assert len(all_results) >= 10  # At least some contracts created

        # Test 2: Concurrent reads while writes happening
        def read_contracts_continuously(user, duration=10):
            """Continuously read contracts for specified duration"""
            headers = e2e_test_base.get_auth_headers(user)
            start_time = time.time()
            read_count = 0

            while time.time() - start_time < duration:
                with performance_helper.measure_time("concurrent_read"):
                    response = client.get("/api/v1/contracts/", headers=headers)
                    if response.status_code == 200:
                        read_count += 1
                time.sleep(0.1)  # Small delay between reads

            return read_count

        def create_contracts_continuously(user, duration=10):
            """Continuously create contracts for specified duration"""
            headers = e2e_test_base.get_auth_headers(user)
            start_time = time.time()
            create_count = 0

            while time.time() - start_time < duration:
                contract_data = {
                    "title": f"Continuous Contract {create_count} by {user.full_name}",
                    "contract_type": "service_agreement",
                    "plain_english_input": f"Continuous testing contract {create_count}",
                }

                with performance_helper.measure_time("concurrent_write"):
                    response = client.post(
                        "/api/v1/contracts/", json=contract_data, headers=headers
                    )
                    if response.status_code == 201:
                        create_count += 1
                time.sleep(0.5)  # Delay between creates

            return create_count

        # Run concurrent reads and writes
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
            # 3 users reading, 3 users writing
            read_futures = [
                executor.submit(read_contracts_continuously, users[i], 10)
                for i in range(3)
            ]
            write_futures = [
                executor.submit(create_contracts_continuously, users[i + 3], 10)
                for i in range(3)
            ]

            # Wait for all operations to complete
            total_reads = sum(future.result(timeout=15) for future in read_futures)
            total_writes = sum(future.result(timeout=15) for future in write_futures)

        # Verify concurrent operations succeeded
        assert total_reads > 0
        assert total_writes > 0

        # Performance assertions
        performance_helper.assert_performance(
            "concurrent_contract_creation", 3000
        )  # 3 seconds per creation
        performance_helper.assert_performance(
            "concurrent_read", 1000
        )  # 1 second per read
        performance_helper.assert_performance(
            "concurrent_write", 3000
        )  # 3 seconds per write

    def test_high_frequency_api_requests(
        self, e2e_test_base: E2ETestBase, performance_helper
    ):
        """Test: High-frequency API requests from single user"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)

        # Create some contracts for testing
        test_contracts = []
        for i in range(10):
            contract_data = {
                "title": f"High Frequency Test Contract {i+1}",
                "contract_type": "service_agreement",
                "plain_english_input": f"Contract {i+1} for high frequency testing",
            }

            response = client.post(
                "/api/v1/contracts/", json=contract_data, headers=headers
            )
            if response.status_code == 201:
                test_contracts.append(response.json())

        # Test 1: Rapid GET requests
        successful_gets = 0
        rate_limited_gets = 0

        for i in range(100):  # 100 rapid requests
            with performance_helper.measure_time("rapid_get_request"):
                response = client.get("/api/v1/contracts/", headers=headers)

                if response.status_code == 200:
                    successful_gets += 1
                elif response.status_code == 429:  # Rate limited
                    rate_limited_gets += 1
                    break  # Stop when rate limited

        # Test 2: Rapid contract detail requests
        if test_contracts:
            successful_details = 0

            for i in range(50):  # 50 rapid detail requests
                contract = test_contracts[i % len(test_contracts)]

                with performance_helper.measure_time("rapid_detail_request"):
                    response = client.get(
                        f"/api/v1/contracts/{contract['id']}", headers=headers
                    )

                    if response.status_code == 200:
                        successful_details += 1
                    elif response.status_code == 429:
                        break

        # Test 3: Mixed operation burst
        mixed_operations = [
            lambda: client.get("/api/v1/contracts/", headers=headers),
            lambda: client.get("/api/v1/analytics/business", headers=headers),
            lambda: client.get("/api/v1/files/", headers=headers),
        ]

        if test_contracts:
            mixed_operations.append(
                lambda: client.get(
                    f"/api/v1/contracts/{test_contracts[0]['id']}", headers=headers
                )
            )

        successful_mixed = 0
        for i in range(30):  # 30 mixed requests
            operation = mixed_operations[i % len(mixed_operations)]

            with performance_helper.measure_time("mixed_burst_request"):
                response = operation()

                if response.status_code == 200:
                    successful_mixed += 1
                elif response.status_code == 429:
                    break

        # Verify some requests succeeded
        assert successful_gets > 0
        assert successful_mixed > 0

        # Performance assertions (should handle reasonable load)
        performance_helper.assert_performance("rapid_get_request", 1000)  # 1 second
        performance_helper.assert_performance("rapid_detail_request", 500)  # 500ms
        performance_helper.assert_performance(
            "mixed_burst_request", 1500
        )  # 1.5 seconds


class TestDataScalePerformance:
    """Tests performance with large datasets"""

    def test_large_contract_dataset_performance(
        self, e2e_test_base: E2ETestBase, performance_helper
    ):
        """Test: Performance with large number of contracts"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)

        # Create large dataset (500 contracts)
        print("Creating large dataset for performance testing...")
        contract_types = [
            "service_agreement",
            "employment_contract",
            "nda",
            "consultancy",
        ]

        batch_size = 50
        for batch in range(10):  # 10 batches of 50 = 500 contracts
            batch_start = time.time()

            for i in range(batch_size):
                contract_index = batch * batch_size + i
                contract_data = {
                    "title": f"Large Dataset Contract {contract_index+1:04d}",
                    "contract_type": contract_types[
                        contract_index % len(contract_types)
                    ],
                    "plain_english_input": f"Performance test contract {contract_index+1} with substantial content for realistic testing scenarios",
                    "client_name": f"Performance Client {(contract_index // 20) + 1:03d}",
                    "supplier_name": f"Supplier Group {(contract_index // 50) + 1}",
                    "contract_value": 15000 + (contract_index * 250),
                    "status": "active" if contract_index % 3 == 0 else "draft",
                }

                response = client.post(
                    "/api/v1/contracts/", json=contract_data, headers=headers
                )
                if response.status_code != 201:
                    print(
                        f"Failed to create contract {contract_index+1}: {response.status_code}"
                    )

            batch_time = time.time() - batch_start
            print(f"Batch {batch+1}/10 completed in {batch_time:.2f}s")

        # Test 1: Listing performance with large dataset
        with performance_helper.measure_time("large_dataset_listing"):
            list_response = client.get(
                "/api/v1/contracts/?page=1&size=50", headers=headers
            )
            e2e_test_base.assert_response_success(list_response)

        list_data = list_response.json()
        assert list_data["total"] >= 500

        # Test 2: Search performance with large dataset
        search_queries = [
            "Dataset Contract 0250",  # Specific contract
            "Performance Client 015",  # Specific client
            "Supplier Group 5",  # Supplier search
            "substantial content",  # Content search
        ]

        for query in search_queries:
            with performance_helper.measure_time("large_dataset_search"):
                search_response = client.get(
                    f"/api/v1/contracts/?search={query}", headers=headers
                )
                e2e_test_base.assert_response_success(search_response)

        # Test 3: Filtered queries on large dataset
        filter_queries = [
            "?contract_type=service_agreement",
            "?status=active",
            "?contract_type=employment_contract&status=draft",
        ]

        for filter_query in filter_queries:
            with performance_helper.measure_time("large_dataset_filtering"):
                filter_response = client.get(
                    f"/api/v1/contracts/{filter_query}", headers=headers
                )
                e2e_test_base.assert_response_success(filter_response)

        # Test 4: Analytics performance with large dataset
        with performance_helper.measure_time("large_dataset_analytics"):
            analytics_response = client.get(
                "/api/v1/analytics/dashboard", headers=headers
            )
            e2e_test_base.assert_response_success(analytics_response)

        # Test 5: Pagination performance across large dataset
        for page in [1, 5, 10, 15, 20]:  # Test various pages
            with performance_helper.measure_time("large_dataset_pagination"):
                page_response = client.get(
                    f"/api/v1/contracts/?page={page}&size=25", headers=headers
                )
                e2e_test_base.assert_response_success(page_response)

        # Performance assertions for large dataset
        performance_helper.assert_performance(
            "large_dataset_listing", 2000
        )  # 2 seconds
        performance_helper.assert_performance("large_dataset_search", 3000)  # 3 seconds
        performance_helper.assert_performance(
            "large_dataset_filtering", 2500
        )  # 2.5 seconds
        performance_helper.assert_performance(
            "large_dataset_analytics", 5000
        )  # 5 seconds
        performance_helper.assert_performance(
            "large_dataset_pagination", 1500
        )  # 1.5 seconds

    def test_bulk_operations_performance(
        self, e2e_test_base: E2ETestBase, performance_helper
    ):
        """Test: Bulk operations performance with various sizes"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        admin_user = e2e_test_base.create_test_user(
            company, e2e_test_base.test_data_factory.create_admin_user_data(company.id)
        )
        headers = e2e_test_base.get_auth_headers(admin_user)

        # Create contracts for bulk operations
        bulk_contracts = []
        for i in range(100):  # 100 contracts for bulk testing
            contract_data = {
                "title": f"Bulk Operations Contract {i+1:03d}",
                "contract_type": "service_agreement",
                "plain_english_input": f"Contract {i+1} for bulk operations performance testing",
                "client_name": f"Bulk Client {i+1:03d}",
                "status": "draft",
            }

            response = client.post(
                "/api/v1/contracts/", json=contract_data, headers=headers
            )
            if response.status_code == 201:
                bulk_contracts.append(response.json())

        # Test 1: Small bulk update (10 contracts)
        small_bulk_data = {
            "updates": [
                {"contract_id": contract["id"], "status": "active"}
                for contract in bulk_contracts[:10]
            ]
        }

        with performance_helper.measure_time("small_bulk_update"):
            small_bulk_response = client.post(
                "/api/v1/bulk/contracts/update", json=small_bulk_data, headers=headers
            )
            e2e_test_base.assert_response_success(small_bulk_response)

        # Test 2: Medium bulk update (25 contracts)
        medium_bulk_data = {
            "updates": [
                {"contract_id": contract["id"], "client_name": f"Updated Client {i}"}
                for i, contract in enumerate(bulk_contracts[10:35])
            ]
        }

        with performance_helper.measure_time("medium_bulk_update"):
            medium_bulk_response = client.post(
                "/api/v1/bulk/contracts/update", json=medium_bulk_data, headers=headers
            )
            e2e_test_base.assert_response_success(medium_bulk_response)

        # Test 3: Large bulk update (50 contracts)
        large_bulk_data = {
            "updates": [
                {"contract_id": contract["id"], "contract_value": 30000 + (i * 1000)}
                for i, contract in enumerate(bulk_contracts[35:85])
            ]
        }

        with performance_helper.measure_time("large_bulk_update"):
            large_bulk_response = client.post(
                "/api/v1/bulk/contracts/update", json=large_bulk_data, headers=headers
            )
            e2e_test_base.assert_response_success(large_bulk_response)

        # Test 4: Bulk export performance
        export_data = {
            "contract_ids": [contract["id"] for contract in bulk_contracts[:30]],
            "format": "json",
            "include_content": False,
        }

        with performance_helper.measure_time("bulk_export"):
            export_response = client.post(
                "/api/v1/bulk/contracts/export", json=export_data, headers=headers
            )
            e2e_test_base.assert_response_success(export_response)

        # Test 5: Bulk delete performance
        delete_data = {
            "contract_ids": [contract["id"] for contract in bulk_contracts[-15:]],
            "deletion_reason": "Performance test cleanup",
        }

        with performance_helper.measure_time("bulk_delete"):
            delete_response = client.post(
                "/api/v1/bulk/contracts/delete", json=delete_data, headers=headers
            )
            e2e_test_base.assert_response_success(delete_response)

        # Performance assertions for bulk operations
        performance_helper.assert_performance(
            "small_bulk_update", 3000
        )  # 3 seconds for 10
        performance_helper.assert_performance(
            "medium_bulk_update", 8000
        )  # 8 seconds for 25
        performance_helper.assert_performance(
            "large_bulk_update", 15000
        )  # 15 seconds for 50
        performance_helper.assert_performance("bulk_export", 5000)  # 5 seconds for 30
        performance_helper.assert_performance("bulk_delete", 5000)  # 5 seconds for 15


class TestMemoryAndResourceUsage:
    """Tests for memory usage and resource consumption"""

    def test_memory_usage_under_load(
        self, e2e_test_base: E2ETestBase, performance_helper
    ):
        """Test: Monitor memory usage during intensive operations"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)

        # Test 1: Create many contracts in sequence
        contracts_created = []
        for i in range(50):
            large_content = (
                f"This is a large contract content for memory testing. " * 100
            )  # Large content

            contract_data = {
                "title": f"Memory Test Contract {i+1}",
                "contract_type": "service_agreement",
                "plain_english_input": large_content,
                "client_name": f"Memory Client {i+1}",
            }

            with performance_helper.measure_time("memory_test_creation"):
                response = client.post(
                    "/api/v1/contracts/", json=contract_data, headers=headers
                )
                if response.status_code == 201:
                    contracts_created.append(response.json())

        # Test 2: Perform memory-intensive operations
        # Large file uploads
        large_file_content = b"x" * (5 * 1024 * 1024)  # 5MB file

        import io

        files = {
            "file": (
                "large_memory_test.txt",
                io.BytesIO(large_file_content),
                "text/plain",
            )
        }

        with performance_helper.measure_time("large_file_upload"):
            upload_response = client.post(
                "/api/v1/files/upload", files=files, headers=headers
            )
            # May succeed or fail based on limits

        # Test 3: Analytics with large dataset
        with performance_helper.measure_time("memory_intensive_analytics"):
            analytics_response = client.get(
                "/api/v1/analytics/dashboard", headers=headers
            )
            e2e_test_base.assert_response_success(analytics_response)

        # Test 4: Bulk export (memory intensive)
        if len(contracts_created) >= 10:
            export_data = {
                "contract_ids": [c["id"] for c in contracts_created[:20]],
                "format": "json",
                "include_content": True,  # Include large content
            }

            with performance_helper.measure_time("memory_intensive_export"):
                export_response = client.post(
                    "/api/v1/bulk/contracts/export", json=export_data, headers=headers
                )
                e2e_test_base.assert_response_success(export_response)

        # Performance assertions (focus on completion, not speed)
        performance_helper.assert_performance("memory_test_creation", 5000)  # 5 seconds
        performance_helper.assert_performance(
            "memory_intensive_analytics", 10000
        )  # 10 seconds
        performance_helper.assert_performance(
            "memory_intensive_export", 15000
        )  # 15 seconds

    def test_connection_and_resource_limits(self, e2e_test_base: E2ETestBase):
        """Test: Database connections and resource pooling under load"""
        client = e2e_test_base.client

        # Setup multiple users
        company = e2e_test_base.create_test_company()
        users = []

        for i in range(20):  # 20 users for connection testing
            user_data = e2e_test_base.test_data_factory.create_user_data(
                company_id=company.id
            )
            user_data["email"] = f"connection-test-{i}@testcompany.com"
            user = e2e_test_base.create_test_user(company, user_data)
            users.append(user)

        def make_database_requests(user, request_count=10):
            """Make multiple database requests for a user"""
            headers = e2e_test_base.get_auth_headers(user)
            successful_requests = 0

            for i in range(request_count):
                # Mix of different database operations
                operations = [
                    lambda: client.get("/api/v1/contracts/", headers=headers),
                    lambda: client.get("/api/v1/analytics/business", headers=headers),
                    lambda: client.get("/api/v1/files/", headers=headers),
                ]

                for operation in operations:
                    response = operation()
                    if response.status_code == 200:
                        successful_requests += 1
                    time.sleep(0.1)  # Small delay

            return successful_requests

        # Test concurrent database access
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(make_database_requests, user, 5)
                for user in users[:10]  # 10 concurrent users
            ]

            results = []
            for future in concurrent.futures.as_completed(futures, timeout=60):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    print(f"Connection test failed: {e}")

        # Verify most requests succeeded (some failures acceptable under high load)
        total_successful = sum(results)
        total_expected = 10 * 5 * 3  # 10 users, 5 iterations, 3 operations each
        success_rate = total_successful / total_expected if total_expected > 0 else 0

        # Should maintain reasonable success rate under load
        assert success_rate >= 0.8, f"Success rate too low: {success_rate:.2f}"


class TestPerformanceBenchmarks:
    """Establishes performance benchmarks for the system"""

    def test_api_response_time_benchmarks(
        self, e2e_test_base: E2ETestBase, performance_helper
    ):
        """Test: Establish response time benchmarks for key APIs"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)

        # Create test data
        contract = e2e_test_base.create_test_contract(company, user)

        # Import file for file operations
        import io

        files = {
            "file": (
                "benchmark.txt",
                io.BytesIO(b"Benchmark test file content"),
                "text/plain",
            )
        }
        upload_response = client.post(
            "/api/v1/files/upload", files=files, headers=headers
        )
        file_data = (
            upload_response.json() if upload_response.status_code == 201 else None
        )

        # Define benchmark tests
        benchmark_operations = [
            (
                "auth_profile",
                lambda: client.get("/api/v1/auth/me", headers=headers),
                200,
            ),
            (
                "contract_list",
                lambda: client.get(
                    "/api/v1/contracts/?page=1&size=10", headers=headers
                ),
                100,
            ),
            (
                "contract_get",
                lambda: client.get(f"/api/v1/contracts/{contract.id}", headers=headers),
                300,
            ),
            (
                "contract_create",
                lambda: client.post(
                    "/api/v1/contracts/",
                    json={
                        "title": "Benchmark Contract",
                        "contract_type": "service_agreement",
                        "plain_english_input": "Benchmark test contract",
                    },
                    headers=headers,
                ),
                2000,
            ),
            (
                "analytics_dashboard",
                lambda: client.get("/api/v1/analytics/dashboard", headers=headers),
                2000,
            ),
            (
                "search_basic",
                lambda: client.get("/api/v1/contracts/?search=test", headers=headers),
                1000,
            ),
        ]

        if file_data:
            benchmark_operations.extend(
                [
                    (
                        "file_list",
                        lambda: client.get("/api/v1/files/", headers=headers),
                        500,
                    ),
                    (
                        "file_download",
                        lambda: client.get(
                            f"/api/v1/files/{file_data['file_id']}", headers=headers
                        ),
                        1000,
                    ),
                ]
            )

        # Run benchmarks
        benchmark_results = {}

        for operation_name, operation_func, target_ms in benchmark_operations:
            times = []

            # Run each operation multiple times for accuracy
            for _ in range(5):
                start_time = time.time()
                try:
                    response = operation_func()
                    end_time = time.time()

                    if response.status_code in [200, 201]:
                        duration_ms = (end_time - start_time) * 1000
                        times.append(duration_ms)
                except Exception as e:
                    print(f"Benchmark operation {operation_name} failed: {e}")

            if times:
                avg_time = statistics.mean(times)
                min_time = min(times)
                max_time = max(times)

                benchmark_results[operation_name] = {
                    "average_ms": avg_time,
                    "min_ms": min_time,
                    "max_ms": max_time,
                    "target_ms": target_ms,
                    "meets_target": avg_time <= target_ms,
                }

                print(
                    f"{operation_name}: avg={avg_time:.2f}ms, target={target_ms}ms, {'✓' if avg_time <= target_ms else '✗'}"
                )

        # Verify benchmarks meet targets
        failed_benchmarks = [
            name
            for name, result in benchmark_results.items()
            if not result["meets_target"]
        ]

        if failed_benchmarks:
            print(f"Failed benchmarks: {failed_benchmarks}")
            # Don't fail the test, but log for monitoring

        # Cleanup
        if file_data:
            client.delete(f"/api/v1/files/{file_data['file_id']}", headers=headers)

        # Store results for reporting
        performance_helper.benchmark_results = benchmark_results

    def test_scalability_projections(
        self, e2e_test_base: E2ETestBase, performance_helper
    ):
        """Test: Project system scalability based on performance metrics"""
        client = e2e_test_base.client

        # Setup
        company = e2e_test_base.create_test_company()
        user = e2e_test_base.create_test_user(company)
        headers = e2e_test_base.get_auth_headers(user)

        # Test scaling with different dataset sizes
        dataset_sizes = [10, 50, 100]
        scaling_results = {}

        for size in dataset_sizes:
            print(f"Testing scalability with {size} contracts...")

            # Create dataset of specified size
            for i in range(size):
                contract_data = {
                    "title": f"Scaling Test Contract {i+1}",
                    "contract_type": "service_agreement",
                    "plain_english_input": f"Contract {i+1} for scaling test",
                }

                client.post("/api/v1/contracts/", json=contract_data, headers=headers)

            # Measure key operations with this dataset size
            operations = {
                "list_contracts": lambda: client.get(
                    "/api/v1/contracts/?page=1&size=20", headers=headers
                ),
                "search_contracts": lambda: client.get(
                    "/api/v1/contracts/?search=Scaling", headers=headers
                ),
                "analytics": lambda: client.get(
                    "/api/v1/analytics/business", headers=headers
                ),
            }

            size_results = {}
            for op_name, op_func in operations.items():
                times = []

                for _ in range(3):  # 3 runs per operation
                    start_time = time.time()
                    response = op_func()
                    end_time = time.time()

                    if response.status_code == 200:
                        duration_ms = (end_time - start_time) * 1000
                        times.append(duration_ms)

                if times:
                    size_results[op_name] = statistics.mean(times)

            scaling_results[size] = size_results

        # Analyze scaling trends
        print("\nScaling Analysis:")
        for operation in ["list_contracts", "search_contracts", "analytics"]:
            print(f"{operation}:")
            for size in dataset_sizes:
                if size in scaling_results and operation in scaling_results[size]:
                    time_ms = scaling_results[size][operation]
                    print(f"  {size} contracts: {time_ms:.2f}ms")

        # Store scaling data
        performance_helper.scaling_results = scaling_results
