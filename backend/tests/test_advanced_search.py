"""
Tests for advanced search and filtering functionality
Following TDD approach - tests first, then implementation
"""
import pytest
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db
from app.core.auth import get_current_user
from app.infrastructure.database.models import (
    User, Contract, ContractStatus, ContractType, Company, Template
)
from app.schemas.search import (
    AdvancedSearchRequest, SearchOperator, DateRangeFilter, 
    NumericRangeFilter, SearchResults, ContractSearchResult,
    UserSearchResult, TemplateSearchResult
)

# Test fixtures
@pytest.fixture
def test_user():
    return User(
        id="test-user-id",
        email="test@example.com",
        full_name="Test User",
        is_active=True,
        company_id="test-company-id",
        role="CONTRACT_MANAGER"
    )

@pytest.fixture
def test_contracts():
    contracts = []
    for i in range(10):
        contract = Contract(
            id=f"contract-{i+1}",
            title=f"Test Contract {i+1}",
            contract_type=ContractType.SERVICE_AGREEMENT if i % 2 == 0 else ContractType.NDA,
            status=ContractStatus.DRAFT if i < 5 else ContractStatus.ACTIVE,
            plain_english_input=f"Contract for service {i+1}",
            client_name=f"Client {i+1}",
            supplier_name=f"Supplier {i+1}" if i % 3 == 0 else None,
            contract_value=1000.0 * (i + 1),
            currency="GBP",
            start_date=datetime.now() - timedelta(days=i*10),
            end_date=datetime.now() + timedelta(days=i*30),
            company_id="test-company-id",
            created_by="test-user-id",
            version=1,
            is_current_version=True
        )
        contracts.append(contract)
    return contracts

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def mock_db():
    return Mock(spec=Session)


class TestAdvancedContractSearch:
    """Test advanced contract search functionality"""

    def test_advanced_search_should_support_text_queries(self, client, mock_db, test_user, test_contracts):
        """Test advanced text search with AND/OR operators"""
        # Given
        search_request = {
            "query": "Service AND Client",
            "operator": "AND",
            "fields": ["title", "client_name", "plain_english_input"],
            "filters": {}
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            # Mock search results - contracts matching "Service AND Client"
            matching_contracts = [c for c in test_contracts if "Service" in str(c.plain_english_input) and "Client" in str(c.client_name)]
            mock_db.query.return_value.filter.return_value.all.return_value = matching_contracts
            
            # When
            response = client.post("/api/v1/search/contracts", json=search_request)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["total"] == len(matching_contracts)
            assert all("Service" in item["plain_english_input"] for item in result["items"])

    def test_advanced_search_should_support_date_range_filters(self, client, mock_db, test_user, test_contracts):
        """Test date range filtering"""
        # Given
        start_date = datetime.now() - timedelta(days=30)
        end_date = datetime.now() + timedelta(days=30)
        
        search_request = {
            "query": "",
            "filters": {
                "start_date": {
                    "gte": start_date.isoformat(),
                    "lte": end_date.isoformat()
                }
            }
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            # Mock contracts within date range
            date_filtered_contracts = [
                c for c in test_contracts 
                if c.start_date and start_date <= c.start_date <= end_date
            ]
            mock_db.query.return_value.filter.return_value.all.return_value = date_filtered_contracts
            
            # When
            response = client.post("/api/v1/search/contracts", json=search_request)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["total"] == len(date_filtered_contracts)

    def test_advanced_search_should_support_numeric_range_filters(self, client, mock_db, test_user, test_contracts):
        """Test numeric range filtering for contract values"""
        # Given
        search_request = {
            "query": "",
            "filters": {
                "contract_value": {
                    "gte": 2000.0,
                    "lte": 8000.0
                }
            }
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            # Mock contracts within value range
            value_filtered_contracts = [
                c for c in test_contracts 
                if c.contract_value and 2000.0 <= c.contract_value <= 8000.0
            ]
            mock_db.query.return_value.filter.return_value.all.return_value = value_filtered_contracts
            
            # When
            response = client.post("/api/v1/search/contracts", json=search_request)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["total"] == len(value_filtered_contracts)
            assert all(2000.0 <= item["contract_value"] <= 8000.0 for item in result["items"])

    def test_advanced_search_should_support_status_filtering(self, client, mock_db, test_user, test_contracts):
        """Test filtering by contract status"""
        # Given
        search_request = {
            "query": "",
            "filters": {
                "status": ["ACTIVE", "DRAFT"]
            }
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            # Mock contracts with specific statuses
            status_filtered_contracts = [
                c for c in test_contracts 
                if c.status.value in ["ACTIVE", "DRAFT"]
            ]
            mock_db.query.return_value.filter.return_value.all.return_value = status_filtered_contracts
            
            # When
            response = client.post("/api/v1/search/contracts", json=search_request)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["total"] == len(status_filtered_contracts)
            assert all(item["status"] in ["ACTIVE", "DRAFT"] for item in result["items"])

    def test_advanced_search_should_support_sorting(self, client, mock_db, test_user, test_contracts):
        """Test search results sorting"""
        # Given
        search_request = {
            "query": "",
            "filters": {},
            "sort": [
                {"field": "contract_value", "direction": "DESC"},
                {"field": "created_at", "direction": "ASC"}
            ]
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            # Mock sorted contracts
            sorted_contracts = sorted(test_contracts, key=lambda x: (-x.contract_value, x.created_at))
            mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = sorted_contracts
            
            # When
            response = client.post("/api/v1/search/contracts", json=search_request)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            
            # Verify sorting (highest value first, then earliest creation date)
            values = [item["contract_value"] for item in result["items"]]
            assert values == sorted(values, reverse=True)

    def test_advanced_search_should_support_pagination(self, client, mock_db, test_user, test_contracts):
        """Test search results pagination"""
        # Given
        search_request = {
            "query": "",
            "filters": {},
            "page": 2,
            "size": 3
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            # Mock paginated results
            total_count = len(test_contracts)
            paginated_contracts = test_contracts[3:6]  # page 2, size 3
            
            mock_db.query.return_value.filter.return_value.count.return_value = total_count
            mock_db.query.return_value.filter.return_value.offset.return_value.limit.return_value.all.return_value = paginated_contracts
            
            # When
            response = client.post("/api/v1/search/contracts", json=search_request)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["total"] == total_count
            assert result["page"] == 2
            assert result["size"] == 3
            assert len(result["items"]) == 3

    def test_advanced_search_should_support_field_selection(self, client, mock_db, test_user, test_contracts):
        """Test selecting specific fields in search results"""
        # Given
        search_request = {
            "query": "",
            "filters": {},
            "select_fields": ["id", "title", "status", "contract_value"]
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            mock_db.query.return_value.filter.return_value.all.return_value = test_contracts[:3]
            
            # When
            response = client.post("/api/v1/search/contracts", json=search_request)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            
            # Verify only selected fields are returned
            for item in result["items"]:
                expected_fields = {"id", "title", "status", "contract_value"}
                actual_fields = set(item.keys())
                assert expected_fields.issubset(actual_fields)

    def test_advanced_search_should_respect_company_isolation(self, client, mock_db, test_user):
        """Test that search respects company boundaries"""
        # Given
        other_company_user = User(
            id="other-user",
            email="other@example.com",
            company_id="other-company-id",
            role="CONTRACT_MANAGER"
        )
        
        search_request = {
            "query": "test",
            "filters": {}
        }
        
        # Mock dependencies - user from different company
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=other_company_user):
            
            # Should only return contracts from user's company
            mock_db.query.return_value.filter.return_value.all.return_value = []  # No contracts for other company
            
            # When
            response = client.post("/api/v1/search/contracts", json=search_request)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["total"] == 0


class TestUserSearch:
    """Test user search functionality"""

    def test_user_search_should_find_by_email_and_name(self, client, mock_db, test_user):
        """Test user search by email and name"""
        # Given
        users = [
            User(id="user-1", email="john@example.com", full_name="John Doe", company_id="test-company-id"),
            User(id="user-2", email="jane@example.com", full_name="Jane Smith", company_id="test-company-id"),
        ]
        
        search_request = {
            "query": "john",
            "filters": {}
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            # Mock user matching "john"
            matching_users = [u for u in users if "john" in u.email.lower() or "john" in u.full_name.lower()]
            mock_db.query.return_value.filter.return_value.all.return_value = matching_users
            
            # When
            response = client.post("/api/v1/search/users", json=search_request)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["total"] == 1
            assert "john" in result["items"][0]["email"].lower()

    def test_user_search_should_filter_by_role(self, client, mock_db, test_user):
        """Test user search with role filtering"""
        # Given
        search_request = {
            "query": "",
            "filters": {
                "role": ["ADMIN", "CONTRACT_MANAGER"]
            }
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            admin_users = [
                User(id="admin-1", role="ADMIN", company_id="test-company-id"),
                User(id="manager-1", role="CONTRACT_MANAGER", company_id="test-company-id")
            ]
            mock_db.query.return_value.filter.return_value.all.return_value = admin_users
            
            # When
            response = client.post("/api/v1/search/users", json=search_request)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["total"] == 2
            assert all(item["role"] in ["ADMIN", "CONTRACT_MANAGER"] for item in result["items"])


class TestTemplateSearch:
    """Test template search functionality"""

    def test_template_search_should_find_by_name_and_category(self, client, mock_db, test_user):
        """Test template search by name and category"""
        # Given
        templates = [
            Template(id="template-1", name="Service Agreement Template", category="service", contract_type=ContractType.SERVICE_AGREEMENT),
            Template(id="template-2", name="NDA Template", category="legal", contract_type=ContractType.NDA),
        ]
        
        search_request = {
            "query": "service",
            "filters": {}
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            # Mock templates matching "service"
            matching_templates = [t for t in templates if "service" in t.name.lower() or "service" in t.category.lower()]
            mock_db.query.return_value.filter.return_value.all.return_value = matching_templates
            
            # When
            response = client.post("/api/v1/search/templates", json=search_request)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["total"] == 1
            assert "service" in result["items"][0]["name"].lower()

    def test_template_search_should_filter_by_contract_type(self, client, mock_db, test_user):
        """Test template search with contract type filtering"""
        # Given
        search_request = {
            "query": "",
            "filters": {
                "contract_type": ["SERVICE_AGREEMENT", "NDA"]
            }
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            filtered_templates = [
                Template(id="t1", contract_type=ContractType.SERVICE_AGREEMENT),
                Template(id="t2", contract_type=ContractType.NDA)
            ]
            mock_db.query.return_value.filter.return_value.all.return_value = filtered_templates
            
            # When
            response = client.post("/api/v1/search/templates", json=search_request)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["total"] == 2
            assert all(item["contract_type"] in ["SERVICE_AGREEMENT", "NDA"] for item in result["items"])


class TestSearchValidation:
    """Test search validation and error handling"""

    def test_search_should_validate_query_length(self, client, mock_db, test_user):
        """Test search query length validation"""
        # Given - query too short
        search_request = {
            "query": "a",  # Too short
            "filters": {}
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            # When
            response = client.post("/api/v1/search/contracts", json=search_request)
            
            # Then
            assert response.status_code == 422  # Validation error

    def test_search_should_validate_pagination_params(self, client, mock_db, test_user):
        """Test pagination parameter validation"""
        # Given - invalid pagination
        search_request = {
            "query": "test",
            "page": 0,  # Invalid - should be >= 1
            "size": 1001  # Invalid - should be <= 1000
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            # When
            response = client.post("/api/v1/search/contracts", json=search_request)
            
            # Then
            assert response.status_code == 422  # Validation error

    def test_search_should_require_authentication(self, client, mock_db):
        """Test that search requires authentication"""
        # Given - no authentication
        search_request = {
            "query": "test",
            "filters": {}
        }
        
        # When
        response = client.post("/api/v1/search/contracts", json=search_request)
        
        # Then
        assert response.status_code == 401  # Unauthorized