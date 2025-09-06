"""
Unit tests for missing coverage in Core Responses Module
Testing static methods and utility functions for response formatting
"""

import pytest
from datetime import datetime
from unittest.mock import patch
from typing import List, Dict, Any

from app.core.responses import ResponseFormatter, APIResponse, MessageTemplates


class TestResponseFormatter:
    """Test ResponseFormatter static methods"""

    def test_success_basic_message_only(self):
        """Test ResponseFormatter.success with message only"""
        result = ResponseFormatter.success("Operation completed")

        assert result.message == "Operation completed"
        assert result.data is None
        assert isinstance(result.timestamp, datetime)

    def test_success_with_data(self):
        """Test ResponseFormatter.success with data"""
        data = {"id": "user-123", "status": "active"}
        result = ResponseFormatter.success("User retrieved", data)

        assert result.message == "User retrieved"
        assert result.data == data
        assert isinstance(result.timestamp, datetime)

    def test_created_with_minimal_data(self):
        """Test ResponseFormatter.created with minimal data"""
        result = ResponseFormatter.created("User", "user-123")

        assert result.message == "User created successfully"
        assert result.data == {"id": "user-123"}
        assert isinstance(result.timestamp, datetime)

    def test_created_with_additional_data(self):
        """Test ResponseFormatter.created with additional data"""
        additional_data = {"email": "test@example.com", "role": "admin"}
        result = ResponseFormatter.created("User", "user-123", additional_data)

        assert result.message == "User created successfully"
        expected_data = {"id": "user-123", "email": "test@example.com", "role": "admin"}
        assert result.data == expected_data
        assert isinstance(result.timestamp, datetime)

    def test_created_without_additional_data(self):
        """Test ResponseFormatter.created without additional data (None)"""
        result = ResponseFormatter.created("Contract", "contract-456", None)

        assert result.message == "Contract created successfully"
        assert result.data == {"id": "contract-456"}
        assert isinstance(result.timestamp, datetime)

    def test_updated_basic(self):
        """Test ResponseFormatter.updated basic functionality"""
        result = ResponseFormatter.updated("Contract", "contract-456")

        assert result.message == "Contract updated successfully"
        assert result.data == {"id": "contract-456"}
        assert isinstance(result.timestamp, datetime)

    def test_deleted_basic(self):
        """Test ResponseFormatter.deleted basic functionality"""
        result = ResponseFormatter.deleted("User", "user-789")

        assert result.message == "User deleted successfully"
        assert result.data == {"id": "user-789"}
        assert isinstance(result.timestamp, datetime)

    def test_operation_completed_without_details(self):
        """Test ResponseFormatter.operation_completed without details"""
        result = ResponseFormatter.operation_completed("export")

        assert result.message == "export completed successfully"
        assert result.data is None
        assert isinstance(result.timestamp, datetime)

    def test_operation_completed_with_details(self):
        """Test ResponseFormatter.operation_completed with details"""
        details = {"exported_count": 42, "format": "CSV"}
        result = ResponseFormatter.operation_completed("export", details)

        assert result.message == "export completed successfully"
        assert result.data == details
        assert isinstance(result.timestamp, datetime)

    def test_paginated_list_basic(self):
        """Test ResponseFormatter.paginated_list basic functionality"""
        items = [{"id": "1", "name": "Item 1"}, {"id": "2", "name": "Item 2"}]
        result = ResponseFormatter.paginated_list(
            items=items, total=10, page=1, size=5, resource_name="users"
        )

        # PaginatedResponse doesn't have timestamp or message like SuccessResponse
        assert result.items == items
        assert result.total == 10
        assert result.page == 1
        assert result.size == 5
        assert result.pages == 2  # total=10, size=5, so pages=2

    def test_paginated_list_default_resource_name(self):
        """Test ResponseFormatter.paginated_list with default resource name"""
        items = [{"id": "1", "name": "Item 1"}]
        result = ResponseFormatter.paginated_list(items=items, total=1, page=1, size=10)

        assert result.items == items
        assert result.total == 1
        assert result.page == 1
        assert result.size == 10
        assert result.pages == 1


class TestAPIResponse:
    """Test APIResponse class and methods"""

    def test_api_response_init_basic(self):
        """Test APIResponse initialization with basic parameters"""
        response = APIResponse(
            data={"test": "data"}, message="Success", status_code=200
        )

        assert response.data == {"test": "data"}
        assert response.message == "Success"
        assert response.status_code == 200
        assert isinstance(response.timestamp, datetime)

    def test_api_response_init_defaults(self):
        """Test APIResponse initialization with default values"""
        response = APIResponse()

        assert response.data is None
        assert response.message is None
        assert response.status_code == 200
        assert isinstance(response.timestamp, datetime)

    def test_api_response_to_dict(self):
        """Test APIResponse.to_dict method"""
        test_data = {"user_id": "123", "email": "test@example.com"}
        response = APIResponse(data=test_data, message="User created", status_code=201)

        result = response.to_dict()

        assert result["data"] == test_data
        assert result["message"] == "User created"
        assert result["status_code"] == 201
        assert "timestamp" in result
        assert isinstance(result["timestamp"], datetime)

    def test_api_response_success_class_method_defaults(self):
        """Test APIResponse.success class method with defaults"""
        response = APIResponse.success()

        assert response.data is None
        assert response.message == "Operation completed successfully"
        assert response.status_code == 200
        assert isinstance(response.timestamp, datetime)

    def test_api_response_success_class_method_with_params(self):
        """Test APIResponse.success class method with parameters"""
        test_data = {"result": "processed"}
        response = APIResponse.success(data=test_data, message="Processing complete")

        assert response.data == test_data
        assert response.message == "Processing complete"
        assert response.status_code == 200
        assert isinstance(response.timestamp, datetime)

    def test_api_response_created_class_method_defaults(self):
        """Test APIResponse.created class method with defaults"""
        response = APIResponse.created()

        assert response.data is None
        assert response.message == "Resource created successfully"
        assert response.status_code == 201
        assert isinstance(response.timestamp, datetime)

    def test_api_response_created_class_method_with_params(self):
        """Test APIResponse.created class method with parameters"""
        test_data = {"id": "new-resource-123"}
        response = APIResponse.created(
            data=test_data, message="Contract created successfully"
        )

        assert response.data == test_data
        assert response.message == "Contract created successfully"
        assert response.status_code == 201
        assert isinstance(response.timestamp, datetime)

    def test_api_response_no_content_class_method_default(self):
        """Test APIResponse.no_content class method with default message"""
        response = APIResponse.no_content()

        assert response.data is None
        assert response.message == "Operation completed successfully"
        assert response.status_code == 204
        assert isinstance(response.timestamp, datetime)

    def test_api_response_no_content_class_method_custom_message(self):
        """Test APIResponse.no_content class method with custom message"""
        response = APIResponse.no_content(message="Resource deleted successfully")

        assert response.data is None
        assert response.message == "Resource deleted successfully"
        assert response.status_code == 204
        assert isinstance(response.timestamp, datetime)


class TestMessageTemplatesUtility:
    """Test MessageTemplates utility methods"""

    def test_message_templates_format_basic(self):
        """Test MessageTemplates.format with basic template"""
        result = MessageTemplates.format("Hello {name}!", name="World")

        assert result == "Hello World!"

    def test_message_templates_format_multiple_args(self):
        """Test MessageTemplates.format with multiple arguments"""
        result = MessageTemplates.format(
            "{count} {resource} {action} successfully",
            count=5,
            resource="contracts",
            action="processed",
        )

        assert result == "5 contracts processed successfully"

    def test_message_templates_format_no_args(self):
        """Test MessageTemplates.format with no arguments"""
        result = MessageTemplates.format("Static message")

        assert result == "Static message"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
