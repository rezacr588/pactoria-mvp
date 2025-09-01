"""
Bulk Operations Service - Domain service for bulk contract and user operations
Implements business logic for bulk operations following DDD patterns
"""
import time
import uuid
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.domain.exceptions import (
    DomainValidationError, BusinessRuleViolationError, 
    ResourceNotFoundError, CompanyAccessError
)
from app.infrastructure.database.models import (
    User, Contract, ContractStatus, ContractType, AuditLog, Company
)
from app.schemas.bulk import (
    BulkContractUpdateRequest, BulkContractDeleteRequest, BulkContractExportRequest,
    BulkUserInviteRequest, BulkUserRoleChangeRequest, BulkOperationResponse,
    BulkOperationError, BulkExportResponse, UserInvitation, ContractBulkUpdateFields
)
from app.core.config import settings
from app.core.validation import ResourceValidator, AuditLogHelper
from app.core.datetime_utils import get_current_utc


@dataclass
class BulkOperationResult:
    """Result of a bulk operation"""
    success_count: int
    failed_count: int
    updated_ids: List[str]
    deleted_ids: List[str]
    invited_emails: List[str]
    errors: List[BulkOperationError]
    warnings: List[str]
    processing_time_ms: float


class BulkOperationsService:
    """
    Domain service for bulk operations on contracts and users
    Encapsulates business rules and ensures data consistency
    """
    
    # Business rule constants
    MAX_BULK_CONTRACTS = 1000
    MAX_BULK_USERS = 100
    MAX_EXPORT_CONTRACTS = 10000
    
    def __init__(self, db: Session):
        self.db = db
    
    async def bulk_update_contracts(
        self, 
        request: BulkContractUpdateRequest, 
        current_user: User
    ) -> BulkOperationResponse:
        """
        Bulk update multiple contracts
        Enforces business rules and maintains data integrity
        """
        start_time = time.time()
        
        # Validate user permissions
        self._ensure_bulk_operation_permissions(current_user)
        
        # Validate request limits
        self._validate_bulk_contract_limits(len(request.contract_ids))
        
        result = BulkOperationResult(
            success_count=0,
            failed_count=0,
            updated_ids=[],
            deleted_ids=[],
            invited_emails=[],
            errors=[],
            warnings=[],
            processing_time_ms=0
        )
        
        try:
            # Fetch contracts that belong to user's company
            contracts = self._get_user_contracts(request.contract_ids, current_user)
            
            # Track which contract IDs were not found
            found_ids = {c.id for c in contracts}
            missing_ids = set(request.contract_ids) - found_ids
            
            for missing_id in missing_ids:
                result.errors.append(BulkOperationError(
                    resource_id=missing_id,
                    error_code="CONTRACT_NOT_FOUND",
                    error_message=f"Contract {missing_id} not found or access denied"
                ))
                result.failed_count += 1
            
            # Process each contract
            for contract in contracts:
                try:
                    # Store old values for audit
                    old_values = self._get_contract_audit_values(contract)
                    
                    # Apply updates
                    updated = self._apply_contract_updates(contract, request.updates)
                    
                    if updated:
                        contract.updated_at = get_current_utc()
                        result.updated_ids.append(contract.id)
                        result.success_count += 1
                        
                        # Create audit log
                        self._create_contract_audit_log(
                            contract=contract,
                            event_type="bulk_contract_update",
                            user_id=current_user.id,
                            old_values=old_values,
                            new_values=self._get_contract_audit_values(contract)
                        )
                    else:
                        result.warnings.append(f"No changes applied to contract {contract.id}")
                        
                except Exception as e:
                    result.errors.append(BulkOperationError(
                        resource_id=contract.id,
                        error_code="UPDATE_FAILED",
                        error_message=str(e),
                        details={"contract_title": contract.title}
                    ))
                    result.failed_count += 1
            
            # Commit all changes if any were made
            if result.success_count > 0:
                self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            raise BusinessRuleViolationError(f"Bulk update failed: {str(e)}")
        
        result.processing_time_ms = (time.time() - start_time) * 1000
        
        return BulkOperationResponse(
            operation_type="bulk_contract_update",
            total_requested=len(request.contract_ids),
            success_count=result.success_count,
            failed_count=result.failed_count,
            processing_time_ms=result.processing_time_ms,
            updated_ids=result.updated_ids,
            errors=result.errors if result.errors else None,
            warnings=result.warnings if result.warnings else None
        )
    
    async def bulk_delete_contracts(
        self, 
        request: BulkContractDeleteRequest, 
        current_user: User
    ) -> BulkOperationResponse:
        """
        Bulk delete (soft delete) multiple contracts
        Maintains referential integrity and audit trail
        """
        start_time = time.time()
        
        # Validate user permissions
        self._ensure_bulk_operation_permissions(current_user)
        
        # Validate request limits
        self._validate_bulk_contract_limits(len(request.contract_ids))
        
        result = BulkOperationResult(
            success_count=0,
            failed_count=0,
            updated_ids=[],
            deleted_ids=[],
            invited_emails=[],
            errors=[],
            warnings=[],
            processing_time_ms=0
        )
        
        try:
            # Fetch contracts that belong to user's company
            contracts = self._get_user_contracts(request.contract_ids, current_user)
            
            # Track which contract IDs were not found
            found_ids = {c.id for c in contracts}
            missing_ids = set(request.contract_ids) - found_ids
            
            for missing_id in missing_ids:
                result.errors.append(BulkOperationError(
                    resource_id=missing_id,
                    error_code="CONTRACT_NOT_FOUND",
                    error_message=f"Contract {missing_id} not found or access denied"
                ))
                result.failed_count += 1
            
            # Process each contract
            for contract in contracts:
                try:
                    # Check if contract can be deleted (business rule)
                    if not self._can_delete_contract(contract):
                        result.errors.append(BulkOperationError(
                            resource_id=contract.id,
                            error_code="CANNOT_DELETE",
                            error_message=f"Contract {contract.id} cannot be deleted in current status",
                            details={"status": contract.status.value, "title": contract.title}
                        ))
                        result.failed_count += 1
                        continue
                    
                    # Perform soft delete
                    old_status = contract.status
                    contract.status = ContractStatus.TERMINATED
                    contract.updated_at = get_current_utc()
                    
                    result.deleted_ids.append(contract.id)
                    result.success_count += 1
                    
                    # Create audit log
                    self._create_contract_audit_log(
                        contract=contract,
                        event_type="bulk_contract_delete",
                        user_id=current_user.id,
                        old_values={"status": old_status.value},
                        new_values={"status": ContractStatus.TERMINATED.value},
                        metadata={
                            "deletion_reason": request.deletion_reason,
                            "hard_delete": request.hard_delete
                        }
                    )
                    
                except Exception as e:
                    result.errors.append(BulkOperationError(
                        resource_id=contract.id,
                        error_code="DELETE_FAILED",
                        error_message=str(e),
                        details={"contract_title": contract.title}
                    ))
                    result.failed_count += 1
            
            # Commit all changes if any were made
            if result.success_count > 0:
                self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            raise BusinessRuleViolationError(f"Bulk delete failed: {str(e)}")
        
        result.processing_time_ms = (time.time() - start_time) * 1000
        
        return BulkOperationResponse(
            operation_type="bulk_contract_delete",
            total_requested=len(request.contract_ids),
            success_count=result.success_count,
            failed_count=result.failed_count,
            processing_time_ms=result.processing_time_ms,
            deleted_ids=result.deleted_ids,
            errors=result.errors if result.errors else None,
            warnings=result.warnings if result.warnings else None
        )
    
    async def bulk_invite_users(
        self, 
        request: BulkUserInviteRequest, 
        current_user: User
    ) -> BulkOperationResponse:
        """
        Bulk invite multiple users to the company
        Enforces business rules for user management
        """
        start_time = time.time()
        
        # Validate user permissions
        self._ensure_admin_permissions(current_user)
        
        # Validate request limits
        if len(request.invitations) > self.MAX_BULK_USERS:
            raise DomainValidationError(
                f"Bulk user invitation limit exceeded. Maximum: {self.MAX_BULK_USERS}"
            )
        
        result = BulkOperationResult(
            success_count=0,
            failed_count=0,
            updated_ids=[],
            deleted_ids=[],
            invited_emails=[],
            errors=[],
            warnings=[],
            processing_time_ms=0
        )
        
        try:
            for invitation in request.invitations:
                try:
                    # Check if user already exists
                    existing_user = self.db.query(User).filter(
                        User.email == invitation.email
                    ).first()
                    
                    if existing_user:
                        if existing_user.company_id == current_user.company_id:
                            result.warnings.append(
                                f"User {invitation.email} is already part of your company"
                            )
                            continue
                        else:
                            result.errors.append(BulkOperationError(
                                resource_id=invitation.email,
                                error_code="USER_EXISTS_OTHER_COMPANY",
                                error_message=f"User {invitation.email} belongs to another company"
                            ))
                            result.failed_count += 1
                            continue
                    
                    # Create user invitation (placeholder - would integrate with actual invitation system)
                    user_invitation = User(
                        email=invitation.email,
                        full_name=invitation.full_name,
                        role=invitation.role,
                        department=invitation.department,
                        company_id=current_user.company_id,
                        is_active=False,  # Inactive until they accept invitation
                        invitation_token=str(uuid.uuid4()),
                        invited_at=get_current_utc(),
                        invited_by=current_user.id
                    )
                    
                    self.db.add(user_invitation)
                    result.invited_emails.append(invitation.email)
                    result.success_count += 1
                    
                    # Create audit log
                    audit_log = AuditLog(
                        event_type="bulk_user_invite",
                        resource_type="user",
                        resource_id=user_invitation.id,
                        user_id=current_user.id,
                        new_values={
                            "email": invitation.email,
                            "role": invitation.role,
                            "department": invitation.department
                        },
                        metadata={"send_email": invitation.send_email}
                    )
                    self.db.add(audit_log)
                    
                    # TODO: Send invitation email if requested
                    if invitation.send_email:
                        # Would integrate with email service here
                        pass
                    
                except Exception as e:
                    result.errors.append(BulkOperationError(
                        resource_id=invitation.email,
                        error_code="INVITATION_FAILED",
                        error_message=str(e),
                        details={"full_name": invitation.full_name}
                    ))
                    result.failed_count += 1
            
            # Commit all changes if any were made
            if result.success_count > 0:
                self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            raise BusinessRuleViolationError(f"Bulk invitation failed: {str(e)}")
        
        result.processing_time_ms = (time.time() - start_time) * 1000
        
        return BulkOperationResponse(
            operation_type="bulk_user_invite",
            total_requested=len(request.invitations),
            success_count=result.success_count,
            failed_count=result.failed_count,
            processing_time_ms=result.processing_time_ms,
            invited_emails=result.invited_emails,
            errors=result.errors if result.errors else None,
            warnings=result.warnings if result.warnings else None
        )
    
    async def bulk_change_user_roles(
        self, 
        request: BulkUserRoleChangeRequest, 
        current_user: User
    ) -> BulkOperationResponse:
        """
        Bulk change user roles
        Enforces permission hierarchies and business rules
        """
        start_time = time.time()
        
        # Validate user permissions
        self._ensure_admin_permissions(current_user)
        
        # Validate request limits
        if len(request.user_ids) > self.MAX_BULK_USERS:
            raise DomainValidationError(
                f"Bulk user role change limit exceeded. Maximum: {self.MAX_BULK_USERS}"
            )
        
        result = BulkOperationResult(
            success_count=0,
            failed_count=0,
            updated_ids=[],
            deleted_ids=[],
            invited_emails=[],
            errors=[],
            warnings=[],
            processing_time_ms=0
        )
        
        try:
            # Fetch users that belong to current user's company
            users = self.db.query(User).filter(
                and_(
                    User.id.in_(request.user_ids),
                    User.company_id == current_user.company_id,
                    User.is_active == True
                )
            ).all()
            
            # Track which user IDs were not found
            found_ids = {u.id for u in users}
            missing_ids = set(request.user_ids) - found_ids
            
            for missing_id in missing_ids:
                result.errors.append(BulkOperationError(
                    resource_id=missing_id,
                    error_code="USER_NOT_FOUND",
                    error_message=f"User {missing_id} not found or access denied"
                ))
                result.failed_count += 1
            
            # Process each user
            for user in users:
                try:
                    # Business rule: Cannot change own role
                    if user.id == current_user.id:
                        result.warnings.append(f"Cannot change your own role: {user.email}")
                        continue
                    
                    # Business rule: Cannot demote the last admin
                    if user.role == "ADMIN" and request.new_role != "ADMIN":
                        admin_count = self.db.query(User).filter(
                            and_(
                                User.company_id == current_user.company_id,
                                User.role == "ADMIN",
                                User.is_active == True
                            )
                        ).count()
                        
                        if admin_count <= 1:
                            result.errors.append(BulkOperationError(
                                resource_id=user.id,
                                error_code="CANNOT_DEMOTE_LAST_ADMIN",
                                error_message=f"Cannot demote the last admin: {user.email}",
                                details={"current_role": user.role}
                            ))
                            result.failed_count += 1
                            continue
                    
                    # Apply role change
                    old_role = user.role
                    if old_role != request.new_role:
                        user.role = request.new_role
                        user.updated_at = get_current_utc()
                        
                        result.updated_ids.append(user.id)
                        result.success_count += 1
                        
                        # Create audit log
                        audit_log = AuditLog(
                            event_type="bulk_user_role_change",
                            resource_type="user",
                            resource_id=user.id,
                            user_id=current_user.id,
                            old_values={"role": old_role},
                            new_values={"role": request.new_role},
                            metadata={"user_email": user.email}
                        )
                        self.db.add(audit_log)
                    else:
                        result.warnings.append(f"User {user.email} already has role {request.new_role}")
                    
                except Exception as e:
                    result.errors.append(BulkOperationError(
                        resource_id=user.id,
                        error_code="ROLE_CHANGE_FAILED",
                        error_message=str(e),
                        details={"user_email": user.email}
                    ))
                    result.failed_count += 1
            
            # Commit all changes if any were made
            if result.success_count > 0:
                self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            raise BusinessRuleViolationError(f"Bulk role change failed: {str(e)}")
        
        result.processing_time_ms = (time.time() - start_time) * 1000
        
        return BulkOperationResponse(
            operation_type="bulk_user_role_change",
            total_requested=len(request.user_ids),
            success_count=result.success_count,
            failed_count=result.failed_count,
            processing_time_ms=result.processing_time_ms,
            updated_ids=result.updated_ids,
            errors=result.errors if result.errors else None,
            warnings=result.warnings if result.warnings else None
        )
    
    # Private helper methods
    
    def _ensure_bulk_operation_permissions(self, user: User):
        """Ensure user has permissions for bulk operations"""
        if not user.company_id:
            raise CompanyAccessError("User must be associated with a company")
        
        # For now, allow CONTRACT_MANAGER and above for bulk operations
        allowed_roles = {"ADMIN", "CONTRACT_MANAGER"}
        if user.role not in allowed_roles:
            raise BusinessRuleViolationError(
                "Insufficient permissions for bulk operations", 
                current_role=user.role,
                required_roles=list(allowed_roles)
            )
    
    def _ensure_admin_permissions(self, user: User):
        """Ensure user has admin permissions"""
        if not user.company_id:
            raise CompanyAccessError("User must be associated with a company")
        
        if user.role != "ADMIN":
            raise BusinessRuleViolationError(
                "Admin permissions required for this operation",
                current_role=user.role,
                required_role="ADMIN"
            )
    
    def _validate_bulk_contract_limits(self, count: int):
        """Validate bulk contract operation limits"""
        if count > self.MAX_BULK_CONTRACTS:
            raise DomainValidationError(
                f"Bulk contract operation limit exceeded. Maximum: {self.MAX_BULK_CONTRACTS}"
            )
    
    def _get_user_contracts(self, contract_ids: List[str], user: User) -> List[Contract]:
        """Get contracts that belong to user's company"""
        return self.db.query(Contract).filter(
            and_(
                Contract.id.in_(contract_ids),
                Contract.company_id == user.company_id,
                Contract.is_current_version == True
            )
        ).all()
    
    def _apply_contract_updates(self, contract: Contract, updates: ContractBulkUpdateFields) -> bool:
        """Apply updates to a contract and return whether any changes were made"""
        changes_made = False
        
        if updates.status is not None and updates.status != contract.status.value:
            contract.status = ContractStatus(updates.status)
            changes_made = True
        
        if updates.client_name is not None and updates.client_name != contract.client_name:
            contract.client_name = updates.client_name
            changes_made = True
        
        if updates.supplier_name is not None and updates.supplier_name != contract.supplier_name:
            contract.supplier_name = updates.supplier_name
            changes_made = True
        
        if updates.contract_value is not None and updates.contract_value != contract.contract_value:
            contract.contract_value = updates.contract_value
            changes_made = True
        
        if updates.currency is not None and updates.currency != contract.currency:
            contract.currency = updates.currency
            changes_made = True
        
        if updates.start_date is not None and updates.start_date != contract.start_date:
            contract.start_date = updates.start_date
            changes_made = True
        
        if updates.end_date is not None and updates.end_date != contract.end_date:
            contract.end_date = updates.end_date
            changes_made = True
        
        if updates.final_content is not None and updates.final_content != contract.final_content:
            contract.final_content = updates.final_content
            changes_made = True
        
        return changes_made
    
    def _get_contract_audit_values(self, contract: Contract) -> Dict[str, Any]:
        """Get contract values for audit logging"""
        return {
            "title": contract.title,
            "status": contract.status.value if contract.status else None,
            "client_name": contract.client_name,
            "supplier_name": contract.supplier_name,
            "contract_value": contract.contract_value,
            "currency": contract.currency
        }
    
    def _can_delete_contract(self, contract: Contract) -> bool:
        """Check if a contract can be deleted based on business rules"""
        # Business rule: Cannot delete ACTIVE contracts with recent activity
        if contract.status == ContractStatus.ACTIVE:
            # Could add additional checks here (e.g., recent modifications, dependencies, etc.)
            return False
        
        # Can delete DRAFT, COMPLETED, or already TERMINATED contracts
        return contract.status in [
            ContractStatus.DRAFT, 
            ContractStatus.COMPLETED, 
            ContractStatus.TERMINATED
        ]
    
    def _create_contract_audit_log(
        self, 
        contract: Contract, 
        event_type: str, 
        user_id: str, 
        old_values: Dict[str, Any], 
        new_values: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Create audit log entry for contract operations"""
        audit_log = AuditLog(
            event_type=event_type,
            resource_type="contract",
            resource_id=contract.id,
            user_id=user_id,
            old_values=old_values,
            new_values=new_values,
            contract_id=contract.id,
            metadata=metadata
        )
        self.db.add(audit_log)


# Factory function for dependency injection
def get_bulk_operations_service(db: Session) -> BulkOperationsService:
    """Factory function to create bulk operations service"""
    return BulkOperationsService(db)