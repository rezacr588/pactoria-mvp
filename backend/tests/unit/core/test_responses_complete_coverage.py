"""
Comprehensive tests for app/core/responses.py to achieve 100% coverage
Tests all response formatters and edge cases
"""
import pytest
from datetime import datetime
from typing import List, Any
from unittest.mock import patch, Mock

from app.core.responses import (
    SuccessResponse,
    PaginatedResponse,
    ResponseFormatter,
    MessageTemplates,
    APIResponse
)


class TestSuccessResponse:
    """Test SuccessResponse class"""
    
    def test_success_response_with_timestamp(self):
        """Test success response with explicit timestamp"""
        timestamp = datetime.now()
        response = SuccessResponse(message="Test message", timestamp=timestamp)
        
        assert response.message == "Test message"
        assert response.timestamp == timestamp
        assert response.data is None
    
    def test_success_response_auto_timestamp(self):
        """Test success response with auto-generated timestamp"""
        with patch('app.core.responses.get_current_utc') as mock_get_utc:
            mock_timestamp = datetime.now()
            mock_get_utc.return_value = mock_timestamp
            
            response = SuccessResponse(message="Test message")
            
            assert response.message == "Test message"
            assert response.timestamp == mock_timestamp
            mock_get_utc.assert_called_once()
    
    def test_success_response_with_data(self):
        """Test success response with data"""
        data = {"key": "value", "number": 42}
        response = SuccessResponse(message="Success", data=data)
        
        assert response.message == "Success"
        assert response.data == data


class TestPaginatedResponse:
    """Test PaginatedResponse class"""
    
    def test_paginated_response_create_basic(self):
        """Test basic paginated response creation"""
        items = [{"id": 1}, {"id": 2}, {"id": 3}]
        response = PaginatedResponse.create(items=items, total=10, page=1, size=3)
        
        assert response.items == items
        assert response.total == 10
        assert response.page == 1
        assert response.size == 3
        assert response.pages == 4  # ceil(10/3) = 4
        assert response.has_next is True
        assert response.has_previous is False
    
    def test_paginated_response_create_last_page(self):
        """Test paginated response for last page"""
        items = [{"id": 10}]
        response = PaginatedResponse.create(items=items, total=10, page=4, size=3)
        
        assert response.items == items
        assert response.total == 10
        assert response.page == 4
        assert response.size == 3
        assert response.pages == 4
        assert response.has_next is False
        assert response.has_previous is True
    
    def test_paginated_response_create_middle_page(self):
        """Test paginated response for middle page"""
        items = [{"id": 4}, {"id": 5}, {"id": 6}]
        response = PaginatedResponse.create(items=items, total=10, page=2, size=3)
        
        assert response.has_next is True
        assert response.has_previous is True
    
    def test_paginated_response_create_empty(self):
        """Test paginated response with no items"""
        response = PaginatedResponse.create(items=[], total=0, page=1, size=10)
        
        assert response.items == []
        assert response.total == 0
        assert response.pages == 0
        assert response.has_next is False
        assert response.has_previous is False
    
    def test_paginated_response_create_exact_pages(self):
        """Test paginated response with exact page division"""
        items = [{"id": 1}, {"id": 2}]
        response = PaginatedResponse.create(items=items, total=6, page=1, size=2)
        
        assert response.pages == 3  # 6/2 = 3 exactly
        assert response.has_next is True


class TestResponseFormatter:
    """Test ResponseFormatter class"""
    
    def test_success_response(self):
        """Test success response creation"""
        response = ResponseFormatter.success("Operation successful", {"id": 123})
        
        assert response.message == "Operation successful"
        assert response.data == {"id": 123}
        assert isinstance(response.timestamp, datetime)
    
    def test_created_response(self):
        """Test created response"""
        response = ResponseFormatter.created("User", "user-123", {"name": "John"})
        
        assert response.message == "User created successfully"
        assert response.data["id"] == "user-123"
        assert response.data["name"] == "John"
    
    def test_updated_response(self):
        """Test updated response"""
        response = ResponseFormatter.updated("Contract", "contract-456")
        
        assert response.message == "Contract updated successfully"
        assert response.data == {"id": "contract-456"}
    
    def test_deleted_response(self):
        """Test deleted response"""
        response = ResponseFormatter.deleted("Template", "template-789")
        
        assert response.message == "Template deleted successfully"
        assert response.data == {"id": "template-789"}
    
    def test_operation_completed(self):
        """Test operation completed response"""
        response = ResponseFormatter.operation_completed("Data export", {"file": "data.csv"})
        
        assert response.message == "Data export completed successfully"
        assert response.data == {"file": "data.csv"}
    
    def test_paginated_list(self):
        """Test paginated list response"""
        items = [{"id": 1}, {"id": 2}]
        response = ResponseFormatter.paginated_list(items, 10, 1, 2, "contracts")
        
        assert response.items == items
        assert response.total == 10
        assert response.page == 1
        assert response.size == 2


class TestMessageTemplates:
    """Test MessageTemplates class"""
    
    def test_format_template(self):
        """Test template formatting"""
        formatted = MessageTemplates.format(MessageTemplates.CREATED, resource="User")
        assert formatted == "User created successfully"
    
    def test_format_template_with_multiple_params(self):
        """Test template formatting with multiple parameters"""
        formatted = MessageTemplates.format(
            MessageTemplates.OPERATION_FAILED, 
            operation="Backup", 
            reason="disk full"
        )
        assert formatted == "Backup failed: disk full"
    
    def test_template_constants(self):
        """Test template constants exist"""
        assert MessageTemplates.CREATED == "{resource} created successfully"
        assert MessageTemplates.UPDATED == "{resource} updated successfully"
        assert MessageTemplates.DELETED == "{resource} deleted successfully"
        assert MessageTemplates.UNAUTHORIZED == "Authentication required"
        assert MessageTemplates.FORBIDDEN == "Access denied: insufficient permissions"


class TestAPIResponse:
    """Test APIResponse class"""
    
    def test_api_response_basic(self):
        """Test basic API response creation"""
        response = APIResponse(data={"test": "value"}, message="Success")
        
        assert response.data == {"test": "value"}
        assert response.message == "Success"
        assert response.status_code == 200
        assert isinstance(response.timestamp, datetime)
    
    def test_api_response_to_dict(self):
        """Test API response conversion to dict"""
        response = APIResponse(data={"id": 123}, message="Created", status_code=201)
        result = response.to_dict()
        
        assert result["data"] == {"id": 123}
        assert result["message"] == "Created"
        assert result["status_code"] == 201
        assert "timestamp" in result
    
    def test_api_response_success_class_method(self):
        """Test APIResponse success class method"""
        response = APIResponse.success(data={"result": "ok"}, message="Done")
        
        assert response.data == {"result": "ok"}
        assert response.message == "Done"
        assert response.status_code == 200
    
    def test_api_response_created_class_method(self):
        """Test APIResponse created class method"""
        response = APIResponse.created(data={"id": "new-id"})
        
        assert response.data == {"id": "new-id"}
        assert response.message == "Resource created successfully"
        assert response.status_code == 201
    
    def test_api_response_no_content_class_method(self):
        """Test APIResponse no content class method"""
        response = APIResponse.no_content(message="Deleted")
        
        assert response.data is None
        assert response.message == "Deleted"
        assert response.status_code == 204


class TestAPIResponseEdgeCases:
    """Test API response edge cases"""
    
    def test_api_response_none_data(self):
        """Test API response with None data"""
        response = APIResponse(data=None, message="No data")
        result = response.to_dict()
        
        assert "data" not in result
        assert result["message"] == "No data"
    
    def test_api_response_none_message(self):
        """Test API response with None message"""
        response = APIResponse(data={"test": "value"}, message=None)
        result = response.to_dict()
        
        assert result["data"] == {"test": "value"}
        assert "message" not in result
    
    def test_api_response_empty_data(self):
        """Test API response with empty data"""
        response = APIResponse(data={}, message="Empty")
        result = response.to_dict()
        
        assert result["data"] == {}
        assert result["message"] == "Empty"


class TestSuccessResponseWithData:
    """Test SuccessResponse with various data types"""
    
    def test_success_response_with_list_data(self):
        """Test success response with list data"""
        data = {"items": [1, 2, 3], "count": 3}
        response = SuccessResponse(message="List retrieved", data=data)
        
        assert response.data["items"] == [1, 2, 3]
        assert response.data["count"] == 3
    
    def test_success_response_with_complex_data(self):
        """Test success response with complex data structure"""
        data = {
            "user": {"id": 1, "name": "John"},
            "permissions": ["read", "write"],
            "metadata": {"created_at": "2023-01-01"}
        }
        response = SuccessResponse(message="User data", data=data)
        
        assert response.data["user"]["name"] == "John"
        assert "read" in response.data["permissions"]
        assert response.data["metadata"]["created_at"] == "2023-01-01"


class TestResponseIntegration:
    """Test response integration scenarios"""
    
    def test_response_formatter_with_api_response(self):
        """Test ResponseFormatter creating API-compatible responses"""
        success_response = ResponseFormatter.success("Operation complete", {"result": "ok"})
        
        # Convert to API response format
        api_response = APIResponse(
            data=success_response.data,
            message=success_response.message,
            status_code=200
        )
        
        result = api_response.to_dict()
        assert result["message"] == "Operation complete"
        assert result["data"] == {"result": "ok"}
        assert result["status_code"] == 200
    
    def test_message_template_integration(self):
        """Test MessageTemplates with ResponseFormatter"""
        message = MessageTemplates.format(MessageTemplates.CREATED, resource="Contract")
        response = ResponseFormatter.success(message, {"id": "contract-123"})
        
        assert response.message == "Contract created successfully"
        assert response.data == {"id": "contract-123"}


class TestMessageTemplateVariety:
    """Test various message template scenarios"""
    
    def test_all_template_constants_exist(self):
        """Test all expected template constants exist"""
        assert hasattr(MessageTemplates, 'CREATED')
        assert hasattr(MessageTemplates, 'UPDATED')
        assert hasattr(MessageTemplates, 'DELETED')
        assert hasattr(MessageTemplates, 'NOT_FOUND')
        assert hasattr(MessageTemplates, 'UNAUTHORIZED')
        assert hasattr(MessageTemplates, 'FORBIDDEN')
        assert hasattr(MessageTemplates, 'INVALID_CREDENTIALS')
        assert hasattr(MessageTemplates, 'ACCOUNT_INACTIVE')
    
    def test_contract_specific_templates(self):
        """Test contract-specific template constants"""
        assert hasattr(MessageTemplates, 'CONTRACT_GENERATED')
        assert hasattr(MessageTemplates, 'CONTRACT_ANALYZED')
        assert hasattr(MessageTemplates, 'CONTRACT_ACTIVATED')
        assert hasattr(MessageTemplates, 'CONTRACT_TERMINATED')
    
    def test_company_access_templates(self):
        """Test company access template constants"""
        assert hasattr(MessageTemplates, 'COMPANY_ACCESS_REQUIRED')
        assert hasattr(MessageTemplates, 'COMPANY_ACCESS_DENIED')


class TestResponseEdgeCases:
    """Test edge cases and error scenarios"""
    
    def test_paginated_response_negative_total(self):
        """Test paginated response with negative total"""
        response = PaginatedResponse.create(items=[], total=-1, page=1, size=10)
        
        assert response.pages == 0
        assert response.has_next is False
        assert response.has_previous is False
    
    def test_paginated_response_zero_size(self):
        """Test paginated response with zero size"""
        with pytest.raises(ZeroDivisionError):
            PaginatedResponse.create(items=[], total=10, page=1, size=0)
    
    def test_success_response_edge_cases(self):
        """Test SuccessResponse edge cases"""
        # Test with very long message
        long_message = "A" * 1000
        response = SuccessResponse(message=long_message)
        assert response.message == long_message
        
        # Test with empty message
        response = SuccessResponse(message="")
        assert response.message == ""
        
        # Test with special characters
        special_message = "Success! @#$%^&*()_+ unicode: 测试"
        response = SuccessResponse(message=special_message)
        assert response.message == special_message


class TestTimestampHandling:
    """Test timestamp handling in responses"""
    
    def test_success_response_timestamp_consistency(self):
        """Test that timestamp is consistent across response creation"""
        with patch('app.core.responses.get_current_utc') as mock_get_utc:
            mock_timestamp = datetime.now()
            mock_get_utc.return_value = mock_timestamp
            
            response1 = SuccessResponse(message="Test 1")
            response2 = SuccessResponse(message="Test 2")
            
            # Both should use mocked timestamp
            assert response1.timestamp == mock_timestamp
            assert response2.timestamp == mock_timestamp
            assert mock_get_utc.call_count == 2
    
    def test_api_response_timestamp_auto_generation(self):
        """Test API response timestamp auto-generation"""
        response = APIResponse(data={"test": "data"}, message="Test")
        
        assert isinstance(response.timestamp, datetime)
        # Should be recent (within last second)
        now = datetime.now()
        assert (now - response.timestamp).total_seconds() < 1


class TestPerformanceAndMemory:
    """Test performance and memory considerations"""
    
    def test_large_paginated_response(self):
        """Test paginated response with large dataset"""
        # Create large item list
        items = [{"id": i} for i in range(1000)]
        
        response = PaginatedResponse.create(
            items=items,
            total=100000,
            page=50,
            size=1000
        )
        
        assert len(response.items) == 1000
        assert response.total == 100000
        assert response.pages == 100
        assert response.has_next is True
        assert response.has_previous is True
    
    def test_validation_errors_memory_efficiency(self):
        """Test validation error formatting with many errors"""
        # Create many validation errors
        errors = []
        for i in range(100):
            errors.append({
                "loc": [f"field_{i}"],
                "msg": f"Error message {i}",
                "type": "value_error"
            })
        
        formatted = format_validation_errors(errors)
        
        assert len(formatted) == 100
        for i in range(100):
            assert f"field_{i}" in formatted
            assert formatted[f"field_{i}"] == [f"Error message {i}"]