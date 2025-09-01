"""
Unit tests for core responses module
Tests response formatting and utility functions
"""
import pytest
from datetime import datetime
from unittest.mock import patch
from typing import List, Dict, Any

from app.core.responses import (
    SuccessResponse, PaginatedResponse, ResponseFormatter
)


class TestSuccessResponse:
    """Test SuccessResponse class"""
    
    def test_success_response_basic(self):
        """Test basic success response creation"""
        response = SuccessResponse(message="Operation successful")
        
        assert response.message == "Operation successful"
        assert response.data is None
        assert isinstance(response.timestamp, datetime)
    
    def test_success_response_with_data(self):
        """Test success response with data"""
        data = {"id": "123", "status": "completed"}
        response = SuccessResponse(message="Operation successful", data=data)
        
        assert response.message == "Operation successful"
        assert response.data == data
        assert isinstance(response.timestamp, datetime)
    
    @patch('app.core.responses.get_current_utc')
    def test_success_response_with_mock_timestamp(self, mock_utc):
        """Test success response with mocked timestamp"""
        mock_time = datetime(2024, 1, 15, 10, 30, 0)
        mock_utc.return_value = mock_time
        
        response = SuccessResponse(message="Test message")
        
        assert response.timestamp == mock_time
        mock_utc.assert_called_once()
    
    def test_success_response_with_custom_timestamp(self):
        """Test success response with custom timestamp"""
        custom_time = datetime(2024, 1, 15, 10, 30, 0)
        response = SuccessResponse(message="Test message", timestamp=custom_time)
        
        assert response.timestamp == custom_time


class TestPaginatedResponse:
    """Test PaginatedResponse class"""
    
    def test_paginated_response_basic(self):
        """Test basic paginated response"""
        items = ["item1", "item2", "item3"]
        response = PaginatedResponse(
            items=items,
            total=3,
            page=1,
            size=10,
            pages=1,
            has_next=False,
            has_previous=False
        )
        
        assert response.items == items
        assert response.total == 3
        assert response.page == 1
        assert response.size == 10
        assert response.pages == 1
        assert response.has_next is False
        assert response.has_previous is False
    
    def test_paginated_response_create_single_page(self):
        """Test create method with single page"""
        items = ["item1", "item2", "item3"]
        response = PaginatedResponse.create(
            items=items,
            total=3,
            page=1,
            size=10
        )
        
        assert response.items == items
        assert response.total == 3
        assert response.page == 1
        assert response.size == 10
        assert response.pages == 1
        assert response.has_next is False
        assert response.has_previous is False
    
    def test_paginated_response_create_multiple_pages(self):
        """Test create method with multiple pages"""
        items = list(range(10))  # 10 items
        response = PaginatedResponse.create(
            items=items,
            total=25,  # Total 25 items
            page=2,    # On page 2
            size=10    # 10 per page
        )
        
        assert response.items == items
        assert response.total == 25
        assert response.page == 2
        assert response.size == 10
        assert response.pages == 3  # (25 + 10 - 1) // 10 = 3
        assert response.has_next is True   # Page 2 of 3
        assert response.has_previous is True  # Page 2 of 3
    
    def test_paginated_response_create_first_page(self):
        """Test create method on first page of multiple"""
        items = list(range(10))
        response = PaginatedResponse.create(
            items=items,
            total=25,
            page=1,
            size=10
        )
        
        assert response.page == 1
        assert response.pages == 3
        assert response.has_next is True
        assert response.has_previous is False
    
    def test_paginated_response_create_last_page(self):
        """Test create method on last page"""
        items = list(range(5))  # Last page with 5 items
        response = PaginatedResponse.create(
            items=items,
            total=25,
            page=3,
            size=10
        )
        
        assert response.page == 3
        assert response.pages == 3
        assert response.has_next is False
        assert response.has_previous is True
    
    def test_paginated_response_create_empty(self):
        """Test create method with empty results"""
        response = PaginatedResponse.create(
            items=[],
            total=0,
            page=1,
            size=10
        )
        
        assert response.items == []
        assert response.total == 0
        assert response.page == 1
        assert response.size == 10
        assert response.pages == 0
        assert response.has_next is False
        assert response.has_previous is False
    
    def test_paginated_response_page_calculation(self):
        """Test page calculation edge cases"""
        # Test exact division
        response = PaginatedResponse.create(
            items=list(range(10)),
            total=20,
            page=1,
            size=10
        )
        assert response.pages == 2
        
        # Test with remainder
        response = PaginatedResponse.create(
            items=list(range(10)),
            total=21,
            page=1,
            size=10
        )
        assert response.pages == 3
        
        # Test single item
        response = PaginatedResponse.create(
            items=["item1"],
            total=1,
            page=1,
            size=10
        )
        assert response.pages == 1


class TestResponseFormatter:
    """Test ResponseFormatter utility class"""
    
    def test_response_formatter_exists(self):
        """Test that ResponseFormatter class exists and can be imported"""
        assert ResponseFormatter is not None
        
    def test_response_formatter_instantiation(self):
        """Test that ResponseFormatter can be instantiated"""
        formatter = ResponseFormatter()
        assert formatter is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])