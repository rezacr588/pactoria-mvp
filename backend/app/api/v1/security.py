"""
Security and compliance endpoints for Pactoria MVP
Security monitoring, GDPR compliance, and audit logging
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from app.core.database import get_db
from app.core.auth import get_current_user, get_admin_user, get_user_company
from app.core.config import settings
from app.infrastructure.database.models import (
    User, Company, Contract, AuditLog, ComplianceScore
)
from app.schemas.security import (
    SecurityEventResponse, SecuritySummaryResponse, ComplianceCheckRequest,
    ComplianceCheckResponse, ComplianceIssue, GDPRDataRequest, GDPRDataResponse,
    AuditLogEntry, AuditLogResponse, SecurityConfigResponse, ThreatIntelligenceResponse
)
from app.services.security_service import security_monitor

router = APIRouter(prefix="/security", tags=["Security & Compliance"])


@router.get("/events", response_model=List[SecurityEventResponse])
async def get_security_events(
    hours: int = Query(24, ge=1, le=168),  # Last 1-168 hours
    severity: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    current_user: User = Depends(get_admin_user),
):
    """Get security events (admin only)"""
    
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    
    # Filter events
    events = []
    for event in security_monitor.security_events:
        if event.timestamp < cutoff:
            continue
        
        if severity and event.severity != severity:
            continue
        
        if event_type and event.event_type != event_type:
            continue
        
        events.append(SecurityEventResponse(
            id=event.id,
            event_type=event.event_type,
            severity=event.severity,
            details=event.details,
            timestamp=event.timestamp
        ))
    
    # Sort by timestamp (newest first)
    events.sort(key=lambda x: x.timestamp, reverse=True)
    
    return events


@router.get("/summary", response_model=SecuritySummaryResponse)
async def get_security_summary(
    hours: int = Query(24, ge=1, le=168),
    current_user: User = Depends(get_admin_user)
):
    """Get security events summary (admin only)"""
    
    summary = security_monitor.get_security_summary(hours)
    
    return SecuritySummaryResponse(
        total_events=summary["total_events"],
        event_types=summary["event_types"],
        severity_counts=summary["severity_counts"],
        time_window_hours=summary["time_window_hours"],
        high_priority_events=summary["high_priority_events"]
    )


@router.post("/compliance/check", response_model=ComplianceCheckResponse)
async def check_compliance(
    compliance_request: ComplianceCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check compliance for a resource"""
    
    issues = []
    recommendations = []
    overall_score = 1.0  # Start with perfect score
    
    if compliance_request.resource_type == "contract":
        contract = db.query(Contract).filter(Contract.id == compliance_request.resource_id).first()
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found"
            )
        
        # Check if user has access to this contract
        if not current_user.is_admin and contract.company_id != current_user.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Get latest compliance score
        compliance_score = db.query(ComplianceScore).filter(
            ComplianceScore.contract_id == contract.id
        ).order_by(desc(ComplianceScore.analysis_date)).first()
        
        if compliance_score:
            overall_score = compliance_score.overall_score
            
            # Convert risk factors to compliance issues
            for risk_factor in compliance_score.risk_factors:
                issues.append(ComplianceIssue(
                    issue_type="risk_factor",
                    severity="medium" if compliance_score.risk_score >= 5 else "low",
                    description=risk_factor,
                    recommendation="Review and address this risk factor",
                    regulation="General"
                ))
            
            recommendations.extend(compliance_score.recommendations)
        
        # GDPR specific checks
        if "GDPR" in compliance_request.compliance_standards:
            if not contract.final_content or "GDPR" not in contract.final_content:
                issues.append(ComplianceIssue(
                    issue_type="missing_gdpr_clause",
                    severity="high",
                    description="Contract may be missing GDPR compliance clauses",
                    recommendation="Add explicit GDPR compliance and data protection clauses",
                    regulation="GDPR"
                ))
                overall_score -= 0.2
        
        # UK Employment Law checks
        if "UK_EMPLOYMENT_LAW" in compliance_request.compliance_standards:
            if contract.contract_type.value == "employment_contract":
                if not contract.final_content or "notice period" not in contract.final_content.lower():
                    issues.append(ComplianceIssue(
                        issue_type="missing_notice_period",
                        severity="medium",
                        description="Employment contract may be missing notice period clause",
                        recommendation="Add explicit notice period requirements as per UK employment law",
                        regulation="UK_EMPLOYMENT_LAW"
                    ))
                    overall_score -= 0.1
    
    elif compliance_request.resource_type == "user":
        user = db.query(User).filter(User.id == compliance_request.resource_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if current user has access
        if not current_user.is_admin and user.company_id != current_user.company_id and user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Basic user compliance checks
        if not user.notification_preferences:
            issues.append(ComplianceIssue(
                issue_type="missing_consent_preferences",
                severity="low",
                description="User has not set notification preferences",
                recommendation="Prompt user to set notification and consent preferences",
                regulation="GDPR"
            ))
            overall_score -= 0.05
    
    elif compliance_request.resource_type == "company":
        company = db.query(Company).filter(Company.id == compliance_request.resource_id).first()
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        
        # Check access
        if not current_user.is_admin and company.id != current_user.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Company compliance checks
        if not company.registration_number:
            issues.append(ComplianceIssue(
                issue_type="missing_registration_number",
                severity="medium",
                description="Company registration number is not provided",
                recommendation="Add company registration number for legal compliance",
                regulation="UK_COMPANY_LAW"
            ))
            overall_score -= 0.1
    
    # Ensure score doesn't go below 0
    overall_score = max(0.0, overall_score)
    
    return ComplianceCheckResponse(
        resource_id=compliance_request.resource_id,
        resource_type=compliance_request.resource_type,
        overall_compliance_score=overall_score,
        issues=issues,
        recommendations=recommendations,
        last_checked=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )


@router.post("/gdpr/data-request", response_model=GDPRDataResponse)
async def create_gdpr_data_request(
    gdpr_request: GDPRDataRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create GDPR data request"""
    
    # Verify user can make request for this email
    if not current_user.is_admin and current_user.email != gdpr_request.user_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only request data for your own email address"
        )
    
    # Find user by email
    user = db.query(User).filter(User.email == gdpr_request.user_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate request ID
    request_id = f"gdpr-{gdpr_request.request_type}-{int(datetime.utcnow().timestamp())}"
    
    # Process different types of GDPR requests
    data_package = None
    status_value = "completed"
    
    if gdpr_request.request_type == "access":
        # Data access request - return user's data
        user_contracts = db.query(Contract).filter(
            Contract.created_by == user.id
        ).all()
        
        data_package = {
            "user_data": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat(),
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
                "timezone": user.timezone,
                "notification_preferences": user.notification_preferences
            },
            "contracts": [
                {
                    "id": contract.id,
                    "title": contract.title,
                    "contract_type": contract.contract_type.value,
                    "status": contract.status.value,
                    "created_at": contract.created_at.isoformat(),
                    "updated_at": contract.updated_at.isoformat() if contract.updated_at else None
                }
                for contract in user_contracts
            ],
            "audit_logs": []  # Limited for privacy
        }
    
    elif gdpr_request.request_type == "portability":
        # Data portability - return data in structured format
        status_value = "processing"  # Would be processed asynchronously
        data_package = {
            "message": "Data export is being processed and will be available for download shortly"
        }
    
    elif gdpr_request.request_type == "erasure":
        # Right to be forgotten - would need careful implementation
        status_value = "processing"
        data_package = {
            "message": "Data erasure request is being processed. Note: some data may need to be retained for legal compliance"
        }
    
    elif gdpr_request.request_type == "rectification":
        # Data rectification - would need additional data
        status_value = "pending"
        data_package = {
            "message": "Please provide the specific data that needs to be corrected"
        }
    
    return GDPRDataResponse(
        request_id=request_id,
        request_type=gdpr_request.request_type,
        user_email=gdpr_request.user_email,
        status=status_value,
        data_package=data_package,
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow() if status_value == "completed" else None
    )


@router.get("/audit-logs", response_model=AuditLogResponse)
async def get_audit_logs(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    event_type: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[str] = None,
    hours: int = Query(168, ge=1, le=8760),  # Last 1 hour to 1 year
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get audit logs"""
    
    # Base query
    query = db.query(AuditLog)
    
    # Time filter
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    query = query.filter(AuditLog.timestamp >= cutoff)
    
    # Company filter (non-admin users can only see their company's logs)
    if not current_user.is_admin:
        if not current_user.company_id:
            # User without company can only see their own actions
            query = query.filter(AuditLog.user_id == current_user.id)
        else:
            # Filter to company's resources
            company_users = db.query(User.id).filter(User.company_id == current_user.company_id).subquery()
            company_contracts = db.query(Contract.id).filter(Contract.company_id == current_user.company_id).subquery()
            
            query = query.filter(
                or_(
                    AuditLog.user_id.in_(company_users),
                    AuditLog.contract_id.in_(company_contracts)
                )
            )
    
    # Additional filters
    if event_type:
        query = query.filter(AuditLog.event_type == event_type)
    
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    # Count total
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * size
    logs = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(size).all()
    
    # Calculate pages
    pages = (total + size - 1) // size
    
    return AuditLogResponse(
        entries=[AuditLogEntry.model_validate(log) for log in logs],
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.get("/config", response_model=SecurityConfigResponse)
async def get_security_config(
    current_user: User = Depends(get_admin_user)
):
    """Get security configuration (admin only)"""
    
    return SecurityConfigResponse(
        rate_limiting_enabled=True,
        max_requests_per_hour=100,
        failed_login_lockout_threshold=5,
        session_timeout_minutes=settings.JWT_EXPIRATION_HOURS * 60,
        password_policy={
            "min_length": 8,
            "require_uppercase": True,
            "require_lowercase": True,
            "require_numbers": True,
            "require_special_chars": False
        },
        mfa_required=False,  # Not implemented yet
        ip_whitelist_enabled=False,
        audit_logging_enabled=True
    )


@router.get("/threat-intelligence", response_model=ThreatIntelligenceResponse)
async def get_threat_intelligence(
    current_user: User = Depends(get_admin_user)
):
    """Get threat intelligence data (admin only)"""
    
    # Get recent security events
    summary = security_monitor.get_security_summary(24)
    
    # Mock threat intelligence data
    recent_attacks = []
    if summary["high_priority_events"] > 0:
        recent_attacks.append({
            "type": "rate_limit_violation",
            "count": summary["event_types"].get("rate_limit_exceeded", 0),
            "last_seen": datetime.utcnow().isoformat()
        })
    
    # Determine threat level
    threat_level = "low"
    if summary["high_priority_events"] > 5:
        threat_level = "high"
    elif summary["high_priority_events"] > 2:
        threat_level = "medium"
    
    return ThreatIntelligenceResponse(
        known_threats=len(security_monitor.suspicious_patterns),
        blocked_ips_count=len(security_monitor.rate_limiter.blocked_ips),
        suspicious_patterns_detected=summary["event_types"].get("suspicious_request", 0),
        recent_attacks=recent_attacks,
        threat_level=threat_level,
        last_updated=datetime.utcnow()
    )