"""
Audit Logging Service for Pactoria MVP
Provides centralized audit trail logging functionality
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request

from app.core.database import get_db
from app.infrastructure.database.models import (
    AuditLog, 
    AuditAction, 
    AuditResourceType, 
    AuditRiskLevel,
    User
)


class AuditService:
    """Central audit logging service for tracking user actions"""
    
    @staticmethod
    def create_audit_log(
        db: Session,
        action: AuditAction,
        resource_type: AuditResourceType,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
        user_role: Optional[str] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        location: Optional[str] = None,
        risk_level: AuditRiskLevel = AuditRiskLevel.LOW,
        compliance_flag: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """
        Create a new audit log entry
        
        Args:
            db: Database session
            action: The action performed
            resource_type: Type of resource affected
            resource_id: ID of the resource
            resource_name: Name/title of the resource
            user_id: ID of the user who performed the action
            user_name: Name of the user (for denormalized access)
            user_role: Role of the user
            details: Descriptive details of the action
            ip_address: IP address of the request
            user_agent: User agent string
            location: Geographic location (if available)
            risk_level: Risk level of the action
            compliance_flag: Whether this action has compliance implications
            metadata: Additional structured data
            request: FastAPI request object (for auto-extracting IP/agent)
            
        Returns:
            Created AuditLog instance
        """
        
        # Auto-extract request information if request provided
        if request:
            if not ip_address:
                ip_address = AuditService._extract_ip_address(request)
            if not user_agent:
                user_agent = request.headers.get("user-agent", "Unknown")
        
        # Create the audit log entry
        audit_log = AuditLog(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            location=location,
            risk_level=risk_level,
            compliance_flag=compliance_flag,
            additional_metadata=metadata or {}
        )
        
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        
        return audit_log
    
    @staticmethod
    def log_user_action(
        db: Session,
        user: User,
        action: AuditAction,
        resource_type: AuditResourceType,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        details: Optional[str] = None,
        risk_level: AuditRiskLevel = AuditRiskLevel.LOW,
        compliance_flag: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """
        Convenience method to log user actions with user context
        
        Args:
            db: Database session
            user: User performing the action
            action: Action being performed
            resource_type: Type of resource
            resource_id: ID of the resource
            resource_name: Name of the resource
            details: Action details
            risk_level: Risk assessment
            compliance_flag: Compliance relevance
            metadata: Additional data
            request: HTTP request for context
            
        Returns:
            Created AuditLog instance
        """
        return AuditService.create_audit_log(
            db=db,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            user_id=user.id,
            user_name=user.full_name,
            user_role=user.role.value if user.role else "unknown",
            details=details,
            risk_level=risk_level,
            compliance_flag=compliance_flag,
            metadata=metadata,
            request=request
        )
    
    @staticmethod
    def log_contract_action(
        db: Session,
        user: User,
        action: AuditAction,
        contract_id: str,
        contract_title: str,
        details: Optional[str] = None,
        risk_level: AuditRiskLevel = AuditRiskLevel.LOW,
        compliance_flag: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """
        Specialized method for contract-related audit logging
        """
        return AuditService.log_user_action(
            db=db,
            user=user,
            action=action,
            resource_type=AuditResourceType.CONTRACT,
            resource_id=contract_id,
            resource_name=contract_title,
            details=details,
            risk_level=risk_level,
            compliance_flag=compliance_flag,
            metadata=metadata,
            request=request
        )
    
    @staticmethod
    def log_auth_action(
        db: Session,
        action: AuditAction,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
        details: Optional[str] = None,
        risk_level: AuditRiskLevel = AuditRiskLevel.MEDIUM,
        request: Optional[Request] = None
    ) -> AuditLog:
        """
        Specialized method for authentication-related audit logging
        """
        return AuditService.create_audit_log(
            db=db,
            action=action,
            resource_type=AuditResourceType.USER,
            resource_id=user_id,
            resource_name=user_name,
            user_id=user_id,
            user_name=user_name,
            details=details,
            risk_level=risk_level,
            compliance_flag=True,  # Auth actions are always compliance-relevant
            request=request
        )
    
    @staticmethod
    def _extract_ip_address(request: Request) -> str:
        """
        Extract the real IP address from request, handling proxies
        """
        # Check for forwarded headers first (common in production)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in the chain (original client)
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return "unknown"


# Convenience functions for common audit patterns
def audit_contract_created(db: Session, user: User, contract_id: str, contract_title: str, request: Optional[Request] = None):
    """Audit log for contract creation"""
    return AuditService.log_contract_action(
        db=db,
        user=user,
        action=AuditAction.CREATE,
        contract_id=contract_id,
        contract_title=contract_title,
        details=f"New contract created: {contract_title}",
        risk_level=AuditRiskLevel.LOW,
        compliance_flag=True,
        request=request
    )


def audit_contract_updated(db: Session, user: User, contract_id: str, contract_title: str, changes: Dict[str, Any], request: Optional[Request] = None):
    """Audit log for contract updates"""
    return AuditService.log_contract_action(
        db=db,
        user=user,
        action=AuditAction.EDIT,
        contract_id=contract_id,
        contract_title=contract_title,
        details=f"Contract updated: {contract_title}",
        risk_level=AuditRiskLevel.MEDIUM if len(changes) > 3 else AuditRiskLevel.LOW,
        compliance_flag=True,
        metadata={"changes": changes},
        request=request
    )


def audit_contract_deleted(db: Session, user: User, contract_id: str, contract_title: str, request: Optional[Request] = None):
    """Audit log for contract deletion"""
    return AuditService.log_contract_action(
        db=db,
        user=user,
        action=AuditAction.DELETE,
        contract_id=contract_id,
        contract_title=contract_title,
        details=f"Contract deleted: {contract_title}",
        risk_level=AuditRiskLevel.HIGH,
        compliance_flag=True,
        request=request
    )


def audit_user_login(db: Session, user_id: str, user_name: str, success: bool = True, request: Optional[Request] = None):
    """Audit log for user login attempts"""
    return AuditService.log_auth_action(
        db=db,
        action=AuditAction.LOGIN,
        user_id=user_id,
        user_name=user_name,
        details=f"User login {'successful' if success else 'failed'}: {user_name}",
        risk_level=AuditRiskLevel.LOW if success else AuditRiskLevel.HIGH,
        request=request
    )


def audit_user_logout(db: Session, user_id: str, user_name: str, request: Optional[Request] = None):
    """Audit log for user logout"""
    return AuditService.log_auth_action(
        db=db,
        action=AuditAction.LOGOUT,
        user_id=user_id,
        user_name=user_name,
        details=f"User logout: {user_name}",
        risk_level=AuditRiskLevel.LOW,
        request=request
    )