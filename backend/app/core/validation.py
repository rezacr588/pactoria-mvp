"""
Common validation utilities for API endpoints
Reduces duplicate validation patterns and provides consistent error handling
"""

from typing import Optional, Any, Dict, List
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.auth import require_company_access
from app.core.exceptions import (
    APIExceptionFactory,
    ResourceNotFoundError,
    CompanyAccessError,
)
from app.infrastructure.database.models import User, Contract, Company, AuditLog


class ResourceValidator:
    """Common resource validation patterns"""

    @staticmethod
    def validate_user_has_company(user: User) -> None:
        """Validate that user is associated with a company"""
        if not user.company_id:
            raise HTTPException(
                status_code=400, detail="User must be associated with a company"
            )

    @staticmethod
    def validate_contract_exists_and_access(
        contract_id: str, current_user: User, db: Session
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
        company_id: str, current_user: User, db: Session
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
            elif not data[field] or (
                isinstance(data[field], str) and not data[field].strip()
            ):
                empty_fields.append(field)

        errors = {}
        if missing_fields:
            errors["missing_fields"] = missing_fields
        if empty_fields:
            errors["empty_fields"] = empty_fields

        if errors:
            raise APIExceptionFactory.unprocessable_entity("Validation failed", errors)


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
        contract_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create audit log data structure"""
        return {
            "event_type": event_type,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "user_id": user_id,
            "old_values": old_values,
            "new_values": new_values,
            "contract_id": contract_id,
        }

    @staticmethod
    def extract_trackable_fields(model, fields: list) -> Dict[str, Any]:
        """Extract trackable field values from a model"""
        return {field: getattr(model, field, None) for field in fields}

    @staticmethod
    def log_action(
        db: Session,
        user: User,
        action: str,
        resource_type: str,
        resource_id: str,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        contract_id: Optional[str] = None,
    ) -> AuditLog:
        """Create and persist an audit log entry"""
        additional_data = {"details": details} if details else None

        audit_log = AuditLog(
            event_type=action,
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user.id,
            old_values=old_values,
            new_values=new_values,
            additional_data=additional_data,
            ip_address=ip_address,
            user_agent=user_agent,
            contract_id=contract_id,
        )

        db.add(audit_log)
        db.commit()
        return audit_log

    @staticmethod
    def log_batch_actions(
        db: Session,
        user: User,
        actions: List[Dict[str, Any]],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> List[AuditLog]:
        """Create multiple audit log entries in a batch"""
        audit_logs = []

        for action_data in actions:
            audit_log = AuditLog(
                event_type=action_data["action"],
                resource_type=action_data["resource_type"],
                resource_id=action_data["resource_id"],
                user_id=user.id,
                old_values=action_data.get("old_values"),
                new_values=action_data.get("new_values"),
                additional_data=action_data.get("additional_data"),
                ip_address=ip_address,
                user_agent=user_agent,
                contract_id=action_data.get("contract_id"),
            )

            audit_logs.append(audit_log)
            db.add(audit_log)

        db.commit()
        return audit_logs

    @staticmethod
    def get_user_audit_trail(
        db: Session, user: User, limit: int = 100
    ) -> List[AuditLog]:
        """Get audit trail for a specific user"""
        return (
            db.query(AuditLog)
            .filter(AuditLog.user_id == user.id)
            .order_by(desc(AuditLog.timestamp))
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_resource_audit_trail(
        db: Session, resource_type: str, resource_id: str, limit: int = 100
    ) -> List[AuditLog]:
        """Get audit trail for a specific resource"""
        return (
            db.query(AuditLog)
            .filter(
                AuditLog.resource_type == resource_type,
                AuditLog.resource_id == resource_id,
            )
            .order_by(desc(AuditLog.timestamp))
            .limit(limit)
            .all()
        )
