"""
Security schemas for Pactoria MVP
Pydantic models for security and compliance requests and responses
"""

from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum


class SecurityEventType(str, Enum):
    """Security event type enumeration"""

    SUSPICIOUS_REQUEST = "suspicious_request"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    POTENTIAL_BRUTE_FORCE = "potential_brute_force"
    SUCCESSFUL_LOGIN = "successful_login"
    FAILED_LOGIN = "failed_login"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DATA_BREACH_ATTEMPT = "data_breach_attempt"


class SecuritySeverity(str, Enum):
    """Security severity enumeration"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SecurityEventResponse(BaseModel):
    """Security event response"""

    id: str
    event_type: str
    severity: str
    details: Dict[str, Any]
    timestamp: datetime


class SecuritySummaryResponse(BaseModel):
    """Security summary response"""

    total_events: int
    event_types: Dict[str, int]
    severity_counts: Dict[str, int]
    time_window_hours: int
    high_priority_events: int


class ComplianceCheckRequest(BaseModel):
    """Compliance check request"""

    resource_type: str  # contract, user, company
    resource_id: str
    compliance_standards: Optional[List[str]] = ["GDPR", "UK_EMPLOYMENT_LAW"]


class ComplianceIssue(BaseModel):
    """Compliance issue"""

    issue_type: str
    severity: str
    description: str
    recommendation: str
    regulation: str


class ComplianceCheckResponse(BaseModel):
    """Compliance check response"""

    resource_id: str
    resource_type: str
    overall_compliance_score: float
    issues: List[ComplianceIssue]
    recommendations: List[str]
    last_checked: datetime
    expires_at: datetime


class GDPRDataRequest(BaseModel):
    """GDPR data request"""

    request_type: str  # "access", "portability", "erasure", "rectification"
    user_email: str
    reason: Optional[str] = None


class GDPRDataResponse(BaseModel):
    """GDPR data response"""

    request_id: str
    request_type: str
    user_email: str
    status: str  # "pending", "processing", "completed", "failed"
    data_package: Optional[Dict[str, Any]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class AuditLogEntry(BaseModel):
    """Audit log entry"""

    id: str
    event_type: str
    resource_type: str
    resource_id: Optional[str]
    user_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    old_values: Optional[Dict[str, Any]]
    new_values: Optional[Dict[str, Any]]
    additional_data: Optional[Dict[str, Any]]
    timestamp: datetime

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    """Audit log response"""

    entries: List[AuditLogEntry]
    total: int
    page: int
    size: int
    pages: int


class SecurityConfigResponse(BaseModel):
    """Security configuration response"""

    rate_limiting_enabled: bool
    max_requests_per_hour: int
    failed_login_lockout_threshold: int
    session_timeout_minutes: int
    password_policy: Dict[str, Any]
    mfa_required: bool
    ip_whitelist_enabled: bool
    audit_logging_enabled: bool


class ThreatIntelligenceResponse(BaseModel):
    """Threat intelligence response"""

    known_threats: int
    blocked_ips_count: int
    suspicious_patterns_detected: int
    recent_attacks: List[Dict[str, Any]]
    threat_level: str  # "low", "medium", "high", "critical"
    last_updated: datetime
