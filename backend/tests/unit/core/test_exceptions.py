"""
Unit tests for core exceptions module
Tests custom exception classes and error handling utilities
"""
import pytest
from fastapi import HTTPException

from app.core.exceptions import (
    APIExceptionFactory, ResourceNotFoundError, CompanyAccessError,
    BusinessRuleViolationError
)


class TestCustomExceptions:
    """Test custom exception classes"""
    
    def test_resource_not_found_error(self):
        """Test ResourceNotFoundError exception"""
        error = ResourceNotFoundError("Contract", "contract-123")
        
        assert "Contract" in str(error)
        assert "contract-123" in str(error)
        assert "not found" in str(error).lower()
    
    def test_company_access_error(self):
        """Test CompanyAccessError exception"""
        error = CompanyAccessError()
        
        assert "company" in str(error).lower()
        assert "access" in str(error).lower() or "permission" in str(error).lower()
    
    def test_company_access_error_with_message(self):
        """Test CompanyAccessError with custom message"""
        custom_message = "Access denied to company resources"
        error = CompanyAccessError(custom_message)
        
        assert custom_message in str(error)
    
    def test_business_rule_violation_error(self):
        """Test BusinessRuleViolationError exception"""
        error = BusinessRuleViolationError("Cannot delete active contract")
        
        assert "Cannot delete active contract" in str(error)


class TestAPIExceptionFactory:
    """Test APIExceptionFactory utility class"""
    
    def test_not_found_exception(self):
        """Test not_found method"""
        exc = APIExceptionFactory.not_found("Contract", "contract-123")
        
        assert isinstance(exc, HTTPException)
        assert exc.status_code == 404
        assert "Contract" in exc.detail
        assert "contract-123" in exc.detail
        assert "not found" in exc.detail.lower()
    
    def test_forbidden_exception(self):
        """Test forbidden method"""
        exc = APIExceptionFactory.forbidden("Access denied to resource")
        
        assert isinstance(exc, HTTPException)
        assert exc.status_code == 403
        assert "Access denied to resource" in exc.detail
    
    def test_forbidden_exception_default_message(self):
        """Test forbidden method with default message"""
        exc = APIExceptionFactory.forbidden()
        
        assert isinstance(exc, HTTPException)
        assert exc.status_code == 403
        assert exc.detail is not None
        assert len(exc.detail) > 0
    
    def test_unauthorized_exception(self):
        """Test unauthorized method"""
        exc = APIExceptionFactory.unauthorized("Invalid token")
        
        assert isinstance(exc, HTTPException)
        assert exc.status_code == 401
        assert "Invalid token" in exc.detail
        assert "WWW-Authenticate" in exc.headers
        assert exc.headers["WWW-Authenticate"] == "Bearer"
    
    def test_unauthorized_exception_default_message(self):
        """Test unauthorized method with default message"""
        exc = APIExceptionFactory.unauthorized()
        
        assert isinstance(exc, HTTPException)
        assert exc.status_code == 401
        assert exc.detail is not None
    
    def test_unprocessable_entity_exception(self):
        """Test unprocessable_entity method"""
        exc = APIExceptionFactory.unprocessable_entity("Invalid data")
        
        assert isinstance(exc, HTTPException)
        assert exc.status_code == 422
        assert "Invalid data" in exc.detail
    
    def test_unprocessable_entity_with_errors(self):
        """Test unprocessable_entity method with error details"""
        errors = {"email": "Invalid format", "password": "Too short"}
        exc = APIExceptionFactory.unprocessable_entity("Validation failed", errors)
        
        assert isinstance(exc, HTTPException)
        assert exc.status_code == 422
        assert isinstance(exc.detail, dict)
        assert "message" in exc.detail
        assert "errors" in exc.detail
    
    def test_internal_server_error_exception(self):
        """Test internal_server_error method"""
        exc = APIExceptionFactory.internal_server_error("Database connection failed")
        
        assert isinstance(exc, HTTPException)
        assert exc.status_code == 500
        assert "Database connection failed" in exc.detail
    
    def test_internal_server_error_default_message(self):
        """Test internal_server_error method with default message"""
        exc = APIExceptionFactory.internal_server_error()
        
        assert isinstance(exc, HTTPException)
        assert exc.status_code == 500
        assert exc.detail is not None
    
    def test_service_unavailable_exception(self):
        """Test service_unavailable method"""
        exc = APIExceptionFactory.service_unavailable("AI service")
        
        assert isinstance(exc, HTTPException)
        assert exc.status_code == 503
        assert "AI service" in exc.detail
        assert "unavailable" in exc.detail.lower()
    
    def test_bad_request_exception(self):
        """Test bad_request method"""
        exc = APIExceptionFactory.bad_request("Invalid request format")
        
        assert isinstance(exc, HTTPException)
        assert exc.status_code == 400
        assert "Invalid request format" in exc.detail
    
    def test_conflict_exception(self):
        """Test conflict method"""
        exc = APIExceptionFactory.conflict("Email already exists")
        
        assert isinstance(exc, HTTPException)
        assert exc.status_code == 409
        assert "Email already exists" in exc.detail




class TestExceptionChaining:
    """Test exception chaining and context preservation"""
    
    def test_exception_with_cause(self):
        """Test that exceptions preserve original cause"""
        original_error = ValueError("Original error")
        
        try:
            raise original_error
        except ValueError as e:
            # Chain the exception
            try:
                raise BusinessRuleViolationError("Wrapped error") from e
            except BusinessRuleViolationError as chained_error:
                assert chained_error.__cause__ == original_error
                assert "Wrapped error" in str(chained_error)
    
    def test_exception_context_preservation(self):
        """Test that exception context is preserved"""
        try:
            # Simulate nested exception handling
            try:
                raise ValueError("Inner error")
            except ValueError:
                raise ResourceNotFoundError("Resource", "123")
        except ResourceNotFoundError as e:
            assert e.__context__ is not None
            assert isinstance(e.__context__, ValueError)
            assert "Inner error" in str(e.__context__)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])