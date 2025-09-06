"""
Common exception handlers and HTTP exception factories
Reduces duplicate HTTPException creation patterns across API endpoints
"""

from fastapi import HTTPException, status
from typing import Optional, Dict, Any


class APIExceptionFactory:
    """Factory for creating common HTTP exceptions with consistent formatting"""

    @staticmethod
    def not_found(resource: str, resource_id: Optional[str] = None) -> HTTPException:
        """Create 404 Not Found exception"""
        if resource_id:
            detail = f"{resource} with ID {resource_id} not found"
        else:
            detail = f"{resource} not found"

        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

    @staticmethod
    def forbidden(
        detail: str = "Access denied: insufficient permissions",
    ) -> HTTPException:
        """Create 403 Forbidden exception"""
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

    @staticmethod
    def bad_request(detail: str) -> HTTPException:
        """Create 400 Bad Request exception"""
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    @staticmethod
    def unauthorized(detail: str = "Authentication required") -> HTTPException:
        """Create 401 Unauthorized exception"""
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

    @staticmethod
    def conflict(detail: str) -> HTTPException:
        """Create 409 Conflict exception"""
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)

    @staticmethod
    def unprocessable_entity(
        detail: str, errors: Optional[Dict[str, Any]] = None
    ) -> HTTPException:
        """Create 422 Unprocessable Entity exception"""
        exception = HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail
        )

        if errors:
            exception.detail = {"message": detail, "errors": errors}

        return exception

    @staticmethod
    def internal_server_error(detail: str = "Internal server error") -> HTTPException:
        """Create 500 Internal Server Error exception"""
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail
        )

    @staticmethod
    def service_unavailable(service: str) -> HTTPException:
        """Create 503 Service Unavailable exception"""
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{service} service is currently unavailable",
        )


class ResourceNotFoundError(Exception):
    """Base exception for resource not found errors"""

    def __init__(self, resource: str, resource_id: Optional[str] = None):
        self.resource = resource
        self.resource_id = resource_id
        message = f"{resource}"
        if resource_id:
            message += f" with ID {resource_id}"
        message += " not found"
        super().__init__(message)


class CompanyAccessError(Exception):
    """Exception for company access violations"""

    def __init__(
        self,
        detail: str = "Access denied: insufficient permissions for company resource",
    ):
        self.detail = detail
        super().__init__(detail)


class BusinessRuleViolationError(Exception):
    """Exception for business rule violations"""

    def __init__(self, rule: str, context: Optional[Dict[str, Any]] = None):
        self.rule = rule
        self.context = context or {}
        super().__init__(rule)


def handle_resource_not_found(exc: ResourceNotFoundError) -> HTTPException:
    """Convert ResourceNotFoundError to HTTP 404"""
    return APIExceptionFactory.not_found(exc.resource, exc.resource_id)


def handle_company_access_error(exc: CompanyAccessError) -> HTTPException:
    """Convert CompanyAccessError to HTTP 403"""
    return APIExceptionFactory.forbidden(exc.detail)


def handle_business_rule_violation(exc: BusinessRuleViolationError) -> HTTPException:
    """Convert BusinessRuleViolationError to HTTP 400"""
    detail = exc.rule
    if exc.context:
        detail += f" Context: {exc.context}"
    return APIExceptionFactory.bad_request(detail)
