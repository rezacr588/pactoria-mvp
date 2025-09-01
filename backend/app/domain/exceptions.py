"""
Domain exceptions for Pactoria contract management
Following DDD patterns for proper error handling within the domain layer
"""
from typing import Optional, Any, Dict


class DomainError(Exception):
    """Base class for all domain-related errors"""
    
    def __init__(self, message: str, error_code: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.details = details or {}


class DomainValidationError(DomainError):
    """Raised when domain validation rules are violated"""
    
    def __init__(self, message: str, field_name: Optional[str] = None, value: Optional[Any] = None):
        super().__init__(message, "DOMAIN_VALIDATION_ERROR")
        self.field_name = field_name
        self.value = value
        if field_name:
            self.details["field"] = field_name
        if value is not None:
            self.details["value"] = str(value)


class BusinessRuleViolationError(DomainError):
    """Raised when business rules are violated"""
    
    def __init__(self, message: str, rule_name: Optional[str] = None, context: Optional[Dict[str, Any]] = None):
        super().__init__(message, "BUSINESS_RULE_VIOLATION")
        self.rule_name = rule_name
        if rule_name:
            self.details["rule"] = rule_name
        if context:
            self.details.update(context)


class ContractNotFoundError(DomainError):
    """Raised when a contract cannot be found"""
    
    def __init__(self, contract_id: str):
        super().__init__(f"Contract with ID '{contract_id}' not found", "CONTRACT_NOT_FOUND")
        self.contract_id = contract_id
        self.details["contract_id"] = contract_id


class ResourceNotFoundError(DomainError):
    """Raised when any resource cannot be found"""
    
    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(f"{resource_type} with ID '{resource_id}' not found", "RESOURCE_NOT_FOUND")
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.details.update({
            "resource_type": resource_type,
            "resource_id": resource_id
        })


class CompanyAccessError(DomainError):
    """Raised when user lacks access to company resources"""
    
    def __init__(self, message: str, user_id: Optional[str] = None, company_id: Optional[str] = None):
        super().__init__(message, "COMPANY_ACCESS_ERROR")
        self.user_id = user_id
        self.company_id = company_id
        if user_id:
            self.details["user_id"] = user_id
        if company_id:
            self.details["company_id"] = company_id


class ContractStateError(BusinessRuleViolationError):
    """Raised when contract is in invalid state for requested operation"""
    
    def __init__(self, message: str, current_status: str, required_status: Optional[str] = None):
        super().__init__(message, "CONTRACT_STATE_ERROR", {
            "current_status": current_status,
            "required_status": required_status
        })
        self.current_status = current_status
        self.required_status = required_status


class ComplianceValidationError(DomainError):
    """Raised when compliance validation fails"""
    
    def __init__(self, message: str, compliance_score: Optional[float] = None, 
                 minimum_required: Optional[float] = None):
        super().__init__(message, "COMPLIANCE_VALIDATION_ERROR")
        self.compliance_score = compliance_score
        self.minimum_required = minimum_required
        if compliance_score is not None:
            self.details["compliance_score"] = compliance_score
        if minimum_required is not None:
            self.details["minimum_required"] = minimum_required


class PermissionDeniedError(DomainError):
    """Raised when user lacks permission for requested operation"""
    
    def __init__(self, message: str, user_id: str, resource_type: str, resource_id: str):
        super().__init__(message, "PERMISSION_DENIED")
        self.user_id = user_id
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.details.update({
            "user_id": user_id,
            "resource_type": resource_type,
            "resource_id": resource_id
        })


class ConcurrencyError(DomainError):
    """Raised when concurrent modification is detected"""
    
    def __init__(self, message: str, entity_id: str, expected_version: int, actual_version: int):
        super().__init__(message, "CONCURRENCY_ERROR")
        self.entity_id = entity_id
        self.expected_version = expected_version
        self.actual_version = actual_version
        self.details.update({
            "entity_id": entity_id,
            "expected_version": expected_version,
            "actual_version": actual_version
        })


class AIServiceError(DomainError):
    """Raised when AI service operations fail"""
    
    def __init__(self, message: str, service_name: str, operation: str):
        super().__init__(message, "AI_SERVICE_ERROR")
        self.service_name = service_name
        self.operation = operation
        self.details.update({
            "service_name": service_name,
            "operation": operation
        })