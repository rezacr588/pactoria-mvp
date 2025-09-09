"""
Audit Trail API endpoints
Provides comprehensive audit logging and activity tracking
"""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc

from app.core.auth import get_current_user, get_user_company
from app.core.database import get_db
from app.infrastructure.database.models import (
    User,
    Company,
    AuditLog,
    AuditAction,
    AuditResourceType,
    AuditRiskLevel
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


# Request/Response Models
class AuditEntryFilter(BaseModel):
    """Audit entry filter parameters"""

    user_id: Optional[str] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    risk_level: Optional[str] = None
    compliance_flag: Optional[bool] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    search: Optional[str] = None


class AuditEntry(BaseModel):
    """Audit entry response model"""

    id: str
    timestamp: datetime
    user_id: str
    user_name: str
    user_role: str
    action: str = Field(
        description="Action performed (create, view, edit, delete, etc.)"
    )
    resource_type: str = Field(
        description="Type of resource (contract, template, user, etc.)"
    )
    resource_id: str
    resource_name: str
    details: str
    ip_address: str
    user_agent: str
    location: Optional[str] = None
    risk_level: str = Field(description="Risk level: low, medium, high")
    compliance_flag: bool = Field(default=False)
    metadata: Optional[dict] = None


class AuditStats(BaseModel):
    """Audit statistics"""

    total_events: int
    high_risk_events: int
    compliance_flags: int
    events_today: int
    events_this_week: int
    events_this_month: int
    most_active_users: List[dict]
    most_common_actions: List[dict]
    risk_distribution: dict


class AuditExportRequest(BaseModel):
    """Audit export request"""

    filters: Optional[AuditEntryFilter] = None
    format: str = Field(default="JSON", description="Export format: JSON, CSV, PDF")
    include_metadata: bool = Field(default=True)


class PaginatedAuditResponse(BaseModel):
    """Paginated audit entries response"""

    entries: List[AuditEntry]
    total: int
    page: int
    size: int
    pages: int


@router.get("/entries", response_model=PaginatedAuditResponse)
async def get_audit_entries(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    action: Optional[str] = Query(None, description="Filter by action"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    compliance_flag: Optional[bool] = Query(
        None, description="Filter by compliance flag"
    ),
    search: Optional[str] = Query(
        None, description="Search in user names, resource names, and details"
    ),
    date_from: Optional[datetime] = Query(None, description="Filter from date"),
    date_to: Optional[datetime] = Query(None, description="Filter to date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get audit entries with filtering and pagination

    Provides comprehensive audit trail with advanced filtering capabilities.
    Only admins can access all entries; others see company-scoped entries.
    """
    try:
        # Build the base query
        query = db.query(AuditLog)

        # Apply company-scoped access control (non-admins only see their company's data)
        if current_user.role.value != "admin":
            # Filter by company if user is not admin
            query = query.join(User, AuditLog.user_id == User.id).filter(
                User.company_id == current_user.company_id
            )

        # Apply filters
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)

        if action:
            try:
                action_enum = AuditAction(action.upper())
                query = query.filter(AuditLog.action == action_enum)
            except ValueError:
                # Invalid action enum value
                pass

        if resource_type:
            try:
                resource_type_enum = AuditResourceType(resource_type.upper())
                query = query.filter(AuditLog.resource_type == resource_type_enum)
            except ValueError:
                # Invalid resource type enum value
                pass

        if risk_level:
            try:
                risk_level_enum = AuditRiskLevel(risk_level.upper())
                query = query.filter(AuditLog.risk_level == risk_level_enum)
            except ValueError:
                # Invalid risk level enum value
                pass

        if compliance_flag is not None:
            query = query.filter(AuditLog.compliance_flag == compliance_flag)

        if date_from:
            query = query.filter(AuditLog.timestamp >= date_from)

        if date_to:
            query = query.filter(AuditLog.timestamp <= date_to)

        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    func.lower(AuditLog.user_name).like(search_term),
                    func.lower(AuditLog.resource_name).like(search_term),
                    func.lower(AuditLog.details).like(search_term)
                )
            )

        # Get total count before pagination
        total = query.count()

        # Apply pagination and ordering
        audit_logs = (
            query.order_by(desc(AuditLog.timestamp))
            .offset((page - 1) * size)
            .limit(size)
            .all()
        )

        # Convert to response models
        entries = [
            AuditEntry(
                id=str(audit_log.id),
                timestamp=audit_log.timestamp,
                user_id=audit_log.user_id or "",
                user_name=audit_log.user_name or "System",
                user_role=audit_log.user_role or "unknown",
                action=audit_log.action.value.lower(),
                resource_type=audit_log.resource_type.value.lower(),
                resource_id=audit_log.resource_id or "",
                resource_name=audit_log.resource_name or "",
                details=audit_log.details or "",
                ip_address=audit_log.ip_address or "unknown",
                user_agent=audit_log.user_agent or "unknown",
                location=audit_log.location,
                risk_level=audit_log.risk_level.value.lower(),
                compliance_flag=audit_log.compliance_flag,
                metadata=audit_log.additional_metadata
            )
            for audit_log in audit_logs
        ]

        return PaginatedAuditResponse(
            entries=entries,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve audit entries: {str(e)}"
        )


@router.get("/entries/{entry_id}", response_model=AuditEntry)
async def get_audit_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific audit entry by ID"""
    try:
        # Build the base query
        query = db.query(AuditLog).filter(AuditLog.id == entry_id)

        # Apply company-scoped access control (non-admins only see their company's data)
        if current_user.role.value != "admin":
            # Filter by company if user is not admin
            query = query.join(User, AuditLog.user_id == User.id).filter(
                User.company_id == current_user.company_id
            )

        audit_log = query.first()

        if not audit_log:
            raise HTTPException(status_code=404, detail="Audit entry not found")

        # Convert to response model
        return AuditEntry(
            id=str(audit_log.id),
            timestamp=audit_log.timestamp,
            user_id=audit_log.user_id or "",
            user_name=audit_log.user_name or "System",
            user_role=audit_log.user_role or "unknown",
            action=audit_log.action.value.lower(),
            resource_type=audit_log.resource_type.value.lower(),
            resource_id=audit_log.resource_id or "",
            resource_name=audit_log.resource_name or "",
            details=audit_log.details or "",
            ip_address=audit_log.ip_address or "unknown",
            user_agent=audit_log.user_agent or "unknown",
            location=audit_log.location,
            risk_level=audit_log.risk_level.value.lower(),
            compliance_flag=audit_log.compliance_flag,
            metadata=audit_log.additional_metadata
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve audit entry: {str(e)}"
        )


@router.get("/stats", response_model=AuditStats)
async def get_audit_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get audit trail statistics"""
    try:
        # Build the base query with company-scoped access control
        base_query = db.query(AuditLog)
        if current_user.role.value != "admin":
            # Filter by company if user is not admin
            base_query = base_query.join(User, AuditLog.user_id == User.id).filter(
                User.company_id == current_user.company_id
            )

        now = datetime.now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)

        # Total events
        total_events = base_query.count()

        # High risk events
        high_risk_events = base_query.filter(
            AuditLog.risk_level == AuditRiskLevel.HIGH
        ).count()

        # Compliance flags
        compliance_flags = base_query.filter(
            AuditLog.compliance_flag
        ).count()

        # Events by time period
        events_today = base_query.filter(
            AuditLog.timestamp >= today
        ).count()

        events_this_week = base_query.filter(
            AuditLog.timestamp >= week_start
        ).count()

        events_this_month = base_query.filter(
            AuditLog.timestamp >= month_start
        ).count()

        # Most active users (top 5)
        most_active_users_query = (
            base_query
            .filter(AuditLog.user_name.isnot(None))
            .with_entities(AuditLog.user_name, func.count(AuditLog.id).label('action_count'))
            .group_by(AuditLog.user_name)
            .order_by(desc(func.count(AuditLog.id)))
            .limit(5)
            .all()
        )
        most_active_users = [
            {"user_name": user_name, "action_count": action_count}
            for user_name, action_count in most_active_users_query
        ]

        # Most common actions (top 5)
        most_common_actions_query = (
            base_query
            .with_entities(AuditLog.action, func.count(AuditLog.id).label('count'))
            .group_by(AuditLog.action)
            .order_by(desc(func.count(AuditLog.id)))
            .limit(5)
            .all()
        )
        most_common_actions = [
            {"action": action.value.lower(), "count": count}
            for action, count in most_common_actions_query
        ]

        # Risk level distribution
        risk_distribution_query = (
            base_query
            .with_entities(AuditLog.risk_level, func.count(AuditLog.id).label('count'))
            .group_by(AuditLog.risk_level)
            .all()
        )
        risk_distribution = {
            risk_level.value.lower(): count
            for risk_level, count in risk_distribution_query
        }

        # Ensure all risk levels are present
        for level in ["low", "medium", "high"]:
            if level not in risk_distribution:
                risk_distribution[level] = 0

        return AuditStats(
            total_events=total_events,
            high_risk_events=high_risk_events,
            compliance_flags=compliance_flags,
            events_today=events_today,
            events_this_week=events_this_week,
            events_this_month=events_this_month,
            most_active_users=most_active_users,
            most_common_actions=most_common_actions,
            risk_distribution=risk_distribution,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve audit statistics: {str(e)}"
        )


@router.post("/entries/export")
async def export_audit_entries(
    export_request: AuditExportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export audit entries with specified filters and format

    Returns a download URL or file data based on the format requested.
    """
    try:
        # Build query based on filters
        query = db.query(AuditLog)

        # Apply company-scoped access control
        if current_user.role.value != "admin":
            query = query.join(User, AuditLog.user_id == User.id).filter(
                User.company_id == current_user.company_id
            )

        # Apply filters if provided
        if export_request.filters:
            filters = export_request.filters

            if filters.user_id:
                query = query.filter(AuditLog.user_id == filters.user_id)

            if filters.action:
                try:
                    action_enum = AuditAction(filters.action.upper())
                    query = query.filter(AuditLog.action == action_enum)
                except ValueError:
                    pass

            if filters.resource_type:
                try:
                    resource_type_enum = AuditResourceType(filters.resource_type.upper())
                    query = query.filter(AuditLog.resource_type == resource_type_enum)
                except ValueError:
                    pass

            if filters.risk_level:
                try:
                    risk_level_enum = AuditRiskLevel(filters.risk_level.upper())
                    query = query.filter(AuditLog.risk_level == risk_level_enum)
                except ValueError:
                    pass

            if filters.compliance_flag is not None:
                query = query.filter(AuditLog.compliance_flag == filters.compliance_flag)

            if filters.date_from:
                query = query.filter(AuditLog.timestamp >= filters.date_from)

            if filters.date_to:
                query = query.filter(AuditLog.timestamp <= filters.date_to)

            if filters.search:
                search_term = f"%{filters.search.lower()}%"
                query = query.filter(
                    or_(
                        func.lower(AuditLog.user_name).like(search_term),
                        func.lower(AuditLog.resource_name).like(search_term),
                        func.lower(AuditLog.details).like(search_term)
                    )
                )

        # Get total count
        total_records = query.count()

        # TODO: Implement actual file generation and storage
        # For now, return a placeholder response indicating the export would be generated

        import uuid
        export_id = str(uuid.uuid4())

        # Estimate file size based on record count (approximate)
        estimated_size_bytes = total_records * 1024  # rough estimate of 1KB per record

        return {
            "success": True,
            "data": {
                "export_id": export_id,
                "format": export_request.format,
                "total_records": total_records,
                "file_size_bytes": estimated_size_bytes,
                "download_url": f"/api/v1/files/exports/audit_export_{export_id}.{export_request.format.lower()}",
                "expires_at": datetime.now() + timedelta(hours=24),
                "processing_time_ms": 100,
                "status": "pending",  # In a real implementation, this would track export progress
                "include_metadata": export_request.include_metadata
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to export audit entries: {str(e)}"
        )
