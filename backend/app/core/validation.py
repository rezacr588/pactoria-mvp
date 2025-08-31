"""
Common validation utilities for API endpoints
Reduces duplicate validation patterns and provides consistent error handling
"""
from typing import Optional, Any, Dict
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.auth import require_company_access
from app.core.exceptions import APIExceptionFactory, ResourceNotFoundError, CompanyAccessError
from app.infrastructure.database.models import User, Contract, Company


class ResourceValidator:
    """Common resource validation patterns"""
    
    @staticmethod
    def validate_user_has_company(user: User) -> None:
        """Validate that user is associated with a company"""
        if not user.company_id:
            raise HTTPException(
                status_code=400,
                detail="User must be associated with a company"
            )
    
    @staticmethod
    def validate_contract_exists_and_access(
        contract_id: str, 
        current_user: User, 
        db: Session
    ) -> Contract:
        """Validate contract exists and user has access"""
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        
        if not contract:
            raise ResourceNotFoundError("Contract", contract_id)
        
        # Check company access
        try:
            require_company_access(current_user, contract.company_id)
        except HTTPException:
            raise CompanyAccessError()
        
        return contract
    
    @staticmethod
    def validate_company_exists_and_access(
        company_id: str,
        current_user: User,
        db: Session
    ) -> Company:
        """Validate company exists and user has access"""
        company = db.query(Company).filter(Company.id == company_id).first()
        
        if not company:
            raise ResourceNotFoundError("Company", company_id)
        
        # Check access
        try:
            require_company_access(current_user, company_id)
        except HTTPException:
            raise CompanyAccessError()
        
        return company
    
    @staticmethod
    def validate_pagination_params(page: int, size: int) -> None:
        """Validate pagination parameters"""
        if page < 1:
            raise APIExceptionFactory.bad_request("Page number must be positive")
        
        if size < 1 or size > 100:
            raise APIExceptionFactory.bad_request("Page size must be between 1 and 100")
    
    @staticmethod
    def validate_enum_value(value: str, enum_class, field_name: str) -> Any:
        """Validate enum value and convert to enum"""
        try:
            return enum_class(value)
        except ValueError:
            valid_values = [e.value for e in enum_class]
            raise APIExceptionFactory.bad_request(
                f"Invalid {field_name}: {value}. Valid values: {valid_values}"
            )
    
    @staticmethod
    def validate_required_fields(data: Dict[str, Any], required_fields: list) -> None:
        """Validate that required fields are present and not empty"""
        missing_fields = []
        empty_fields = []
        
        for field in required_fields:
            if field not in data:
                missing_fields.append(field)
            elif not data[field] or (isinstance(data[field], str) and not data[field].strip()):
                empty_fields.append(field)
        
        errors = {}
        if missing_fields:
            errors["missing_fields"] = missing_fields
        if empty_fields:
            errors["empty_fields"] = empty_fields
        
        if errors:
            raise APIExceptionFactory.unprocessable_entity(
                "Validation failed", errors
            )


class AuditLogHelper:
    """Helper for creating consistent audit log entries"""
    
    @staticmethod
    def create_audit_data(
        event_type: str,
        resource_type: str,
        resource_id: str,
        user_id: str,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        contract_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create audit log data structure"""
        return {
            "event_type": event_type,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "user_id": user_id,
            "old_values": old_values,
            "new_values": new_values,
            "contract_id": contract_id
        }
    
    @staticmethod
    def extract_trackable_fields(model, fields: list) -> Dict[str, Any]:
        """Extract trackable field values from a model"""
        return {
            field: getattr(model, field, None) for field in fields
        }