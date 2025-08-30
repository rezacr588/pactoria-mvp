"""
Analytics schemas for Pactoria MVP
Pydantic models for analytics requests and responses
"""
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from enum import Enum


class MetricPeriod(str, Enum):
    """Metric period enumeration"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class BusinessMetricsResponse(BaseModel):
    """Business metrics response"""
    total_contracts: int
    active_contracts: int
    draft_contracts: int
    completed_contracts: int
    terminated_contracts: int
    total_contract_value: float
    average_contract_value: float
    compliance_score_average: float
    high_risk_contracts: int
    contracts_this_month: int
    contracts_last_month: int
    growth_rate: float


class UserMetricsResponse(BaseModel):
    """User activity metrics"""
    total_users: int
    active_users_30d: int
    new_users_this_month: int
    user_engagement_score: float
    contracts_per_user: float
    most_active_users: List[Dict[str, Any]]


class ContractTypeMetrics(BaseModel):
    """Contract type distribution metrics"""
    contract_type: str
    count: int
    percentage: float
    total_value: float
    average_value: float
    compliance_score: Optional[float]


class TimeSeriesDataPoint(BaseModel):
    """Time series data point"""
    date: date
    value: float
    count: Optional[int] = None


class TimeSeriesResponse(BaseModel):
    """Time series metrics response"""
    metric_name: str
    period: str
    data_points: List[TimeSeriesDataPoint]
    total: float
    average: float
    trend_direction: str  # "up", "down", "stable"
    trend_percentage: float


class ComplianceMetricsResponse(BaseModel):
    """Compliance metrics response"""
    overall_compliance_average: float
    gdpr_compliance_average: float
    employment_law_compliance_average: float
    consumer_rights_compliance_average: float
    commercial_terms_compliance_average: float
    high_risk_contracts_count: int
    medium_risk_contracts_count: int
    low_risk_contracts_count: int
    compliance_trend: str
    recommendations_count: int


class SystemHealthResponse(BaseModel):
    """System health metrics"""
    uptime_percentage: float
    average_response_time_ms: float
    total_requests_24h: int
    error_rate_percentage: float
    ai_service_health: str
    database_health: str
    active_sessions: int
    peak_concurrent_users: int


class PerformanceMetricsResponse(BaseModel):
    """Performance metrics response"""
    ai_generation_average_time_ms: float
    compliance_analysis_average_time_ms: float
    api_response_times: Dict[str, float]
    success_rates: Dict[str, float]
    token_usage_total: int
    token_usage_average_per_request: float


class AnalyticsFilter(BaseModel):
    """Analytics filter parameters"""
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    contract_types: Optional[List[str]] = None
    company_id: Optional[str] = None
    user_id: Optional[str] = None
    include_drafts: bool = True