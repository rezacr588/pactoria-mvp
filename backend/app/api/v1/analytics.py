"""
Analytics and monitoring endpoints for Pactoria MVP
Business metrics, performance monitoring, and system health
"""

from datetime import timedelta, datetime, date as dt_date
from app.core.datetime_utils import get_current_utc
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text, case

from app.core.database import get_db
from app.core.auth import get_admin_user, get_user_company
from app.infrastructure.database.models import (
    User,
    Company,
    Contract,
    AIGeneration,
    ComplianceScore,
    ContractStatus,
)
from app.schemas.analytics import (
    BusinessMetricsResponse,
    UserMetricsResponse,
    ContractTypeMetrics,
    TimeSeriesResponse,
    TimeSeriesDataPoint,
    ComplianceMetricsResponse,
    SystemHealthResponse,
    PerformanceMetricsResponse,
    MetricPeriod,
    DashboardResponse,
)
from app.schemas.common import UnauthorizedError, ForbiddenError
from app.services.ai_service import ai_service
from app.services.analytics_cache_service import cache_analytics_result
from app.services.query_performance_monitor import log_query_performance

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    summary="Get Dashboard Analytics",
    description="""
    Get comprehensive dashboard analytics for the company.

    **Includes:**
    - Business metrics (contracts, values, growth)
    - User activity and engagement metrics
    - Contract type distribution
    - Compliance scores and risk analysis
    - Time series trends for contracts and values
    - Executive summary with key insights

    **Features:**
    - Real-time data aggregation
    - Company-specific metrics
    - Trend analysis and insights
    - Performance indicators
    - Risk assessment summary

    **Use Cases:**
    - Executive dashboard display
    - Business intelligence reporting
    - Performance monitoring
    - Compliance oversight

    **Requires Authentication:** JWT Bearer token with company association
    """,
    responses={
        200: {
            "description": "Dashboard analytics retrieved successfully",
            "model": DashboardResponse,
        },
        401: {"description": "Authentication required", "model": UnauthorizedError},
        403: {"description": "Company association required", "model": ForbiddenError},
    },
)
async def get_dashboard_analytics(
    company: Company = Depends(get_user_company), db: Session = Depends(get_db)
):
    """Get comprehensive dashboard analytics"""

    # Get all individual metrics
    business_metrics = await get_business_metrics(company, db)
    user_metrics = await get_user_metrics(company, db)
    contract_types = await get_contract_type_metrics(company, db)
    compliance_metrics = await get_compliance_metrics(company, db)

    # Get time series data for trends
    recent_contracts_trend = await get_time_series_metrics(
        "contracts_created", MetricPeriod.DAILY, 30, company, db
    )

    contract_value_trend = await get_time_series_metrics(
        "contract_value", MetricPeriod.WEEKLY, 90, company, db
    )

    # Generate executive summary
    total_contracts = business_metrics.total_contracts
    total_value = business_metrics.total_contract_value
    avg_compliance = business_metrics.compliance_score_average
    growth_rate = business_metrics.growth_rate
    high_risk_count = business_metrics.high_risk_contracts

    # Determine key insights
    insights = []
    if growth_rate > 10:
        insights.append(
            f"Strong growth with {growth_rate:.1f}% increase in contracts this month"
        )
    elif growth_rate < -10:
        insights.append(
            f"Contract volume declined {abs(growth_rate):.1f}% this month - review needed"
        )

    if avg_compliance < 0.7:
        insights.append(
            "Compliance scores below recommended threshold - immediate attention required"
        )
    elif avg_compliance > 0.9:
        insights.append("Excellent compliance standards maintained")

    if high_risk_count > 0:
        insights.append(f"{high_risk_count} high-risk contracts need immediate review")

    if total_value > 100000:  # £100k+
        insights.append(
            f"Portfolio value of £{total_value:,.0f} represents significant business value"
        )

    # Contract distribution analysis
    top_contract_type = None
    if contract_types:
        try:
            top_contract_type = max(contract_types, key=lambda x: getattr(x, 'count', 0))
        except (TypeError, AttributeError) as e:
            # Fallback in case of attribute issues
            top_contract_type = contract_types[0] if contract_types else None
    
    if top_contract_type:
        insights.append(f"{top_contract_type.contract_type.replace('_', ' ').title()
                           } contracts dominate portfolio ({top_contract_type.percentage:.1f}%)")

    summary = {
        "total_contracts": total_contracts,
        "total_portfolio_value": total_value,
        "average_compliance_score": avg_compliance,
        "monthly_growth_rate": growth_rate,
        "high_risk_contracts": high_risk_count,
        "key_insights": insights,
        "overall_health": (
            "excellent"
            if avg_compliance > 0.9 and high_risk_count == 0
            else (
                "good"
                if avg_compliance > 0.8 and high_risk_count < 3
                else "needs_attention"
            )
        ),
        "recommended_actions": [],
    }

    # Generate recommendations
    recommendations = summary["recommended_actions"]
    if high_risk_count > 0:
        recommendations.append(
            f"Review and remediate {high_risk_count} high-risk contracts"
        )
    if avg_compliance < 0.8:
        recommendations.append(
            "Improve contract compliance through template updates and AI analysis"
        )
    if growth_rate < 0:
        recommendations.append(
            "Analyze factors contributing to contract volume decline"
        )
    if user_metrics.user_engagement_score < 50:
        recommendations.append(
            "Improve user engagement through training and workflow optimization"
        )

    if not recommendations:
        recommendations.append(
            "Continue maintaining excellent contract management practices"
        )

    return DashboardResponse(
        business_metrics=business_metrics,
        user_metrics=user_metrics,
        contract_types=contract_types,
        compliance_metrics=compliance_metrics,
        recent_contracts_trend=recent_contracts_trend,
        contract_value_trend=contract_value_trend,
        summary=summary,
    )


@router.get("/business", response_model=BusinessMetricsResponse)
@cache_analytics_result(ttl_seconds=300)  # Cache for 5 minutes
@log_query_performance("get_business_metrics")
async def get_business_metrics(
    company: Company = Depends(get_user_company), db: Session = Depends(get_db)
):
    """Get business metrics for company"""

    # OPTIMIZED: Single query for all contract counts and values using conditional aggregation
    contract_stats = (
        db.query(
            # Count by status using CASE statements
            func.sum(
                case(
                    (Contract.status == ContractStatus.ACTIVE, 1),
                    else_=0
                )
            ).label("active_contracts"),
            func.sum(
                case(
                    (Contract.status == ContractStatus.DRAFT, 1),
                    else_=0
                )
            ).label("draft_contracts"),
            func.sum(
                case(
                    (Contract.status == ContractStatus.COMPLETED, 1),
                    else_=0
                )
            ).label("completed_contracts"),
            func.sum(
                case(
                    (Contract.status == ContractStatus.TERMINATED, 1),
                    else_=0
                )
            ).label("terminated_contracts"),
            # Total count and values
            func.count(Contract.id).label("total_contracts"),
            func.sum(Contract.contract_value).label("total_value"),
            func.avg(Contract.contract_value).label("average_value"),
        )
        .filter(Contract.company_id == company.id, Contract.is_current_version)
        .first()
    )

    total_contracts = contract_stats.total_contracts or 0
    active_contracts = contract_stats.active_contracts or 0
    draft_contracts = contract_stats.draft_contracts or 0
    completed_contracts = contract_stats.completed_contracts or 0
    terminated_contracts = contract_stats.terminated_contracts or 0
    total_value = float(contract_stats.total_value) if contract_stats.total_value else 0.0
    avg_value = float(contract_stats.average_value) if contract_stats.average_value else 0.0

    # OPTIMIZED: Single query for compliance metrics and high risk contracts
    compliance_stats = (
        db.query(
            func.avg(ComplianceScore.overall_score).label("compliance_avg"),
            func.sum(
                case(
                    (ComplianceScore.risk_score >= 7, 1),
                    else_=0
                )
            ).label("high_risk_count"),
        )
        .join(Contract)
        .filter(Contract.company_id == company.id)
        .first()
    )

    compliance_avg = float(compliance_stats.compliance_avg) if compliance_stats.compliance_avg else 0.8
    high_risk_contracts = compliance_stats.high_risk_count or 0

    # Monthly growth
    now = get_current_utc()
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

    contracts_this_month = (
        db.query(Contract)
        .filter(
            Contract.company_id == company.id, Contract.created_at >= this_month_start
        )
        .count()
    )

    contracts_last_month = (
        db.query(Contract)
        .filter(
            Contract.company_id == company.id,
            Contract.created_at >= last_month_start,
            Contract.created_at < this_month_start,
        )
        .count()
    )

    growth_rate = 0.0
    if contracts_last_month > 0:
        growth_rate = (
            (contracts_this_month - contracts_last_month) / contracts_last_month
        ) * 100

    return BusinessMetricsResponse(
        total_contracts=total_contracts,
        active_contracts=active_contracts,
        draft_contracts=draft_contracts,
        completed_contracts=completed_contracts,
        terminated_contracts=terminated_contracts,
        total_contract_value=total_value,
        average_contract_value=avg_value,
        compliance_score_average=float(compliance_avg),
        high_risk_contracts=high_risk_contracts,
        contracts_this_month=contracts_this_month,
        contracts_last_month=contracts_last_month,
        growth_rate=growth_rate,
    )


@router.get("/users", response_model=UserMetricsResponse)
@cache_analytics_result(ttl_seconds=300)  # Cache for 5 minutes
@log_query_performance("get_user_metrics")
async def get_user_metrics(
    company: Company = Depends(get_user_company), db: Session = Depends(get_db)
):
    """Get user activity metrics for company"""

    # User counts
    total_users = db.query(User).filter(User.company_id == company.id).count()

    thirty_days_ago = get_current_utc() - timedelta(days=30)
    active_users_30d = (
        db.query(User)
        .filter(User.company_id == company.id, User.last_login_at >= thirty_days_ago)
        .count()
    )

    this_month_start = get_current_utc().replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    new_users_this_month = (
        db.query(User)
        .filter(User.company_id == company.id, User.created_at >= this_month_start)
        .count()
    )

    # User engagement
    user_engagement_score = (
        (active_users_30d / total_users * 100) if total_users > 0 else 0
    )

    # Contracts per user
    total_contracts = (
        db.query(Contract)
        .filter(Contract.company_id == company.id, Contract.is_current_version)
        .count()
    )
    contracts_per_user = total_contracts / total_users if total_users > 0 else 0

    # Most active users
    most_active = (
        db.query(
            User.id,
            User.full_name,
            User.email,
            func.count(Contract.id).label("contract_count"),
        )
        .outerjoin(Contract)
        .filter(User.company_id == company.id)
        .group_by(User.id, User.full_name, User.email)
        .order_by(desc("contract_count"))
        .limit(5)
        .all()
    )

    most_active_users = [
        {
            "user_id": user.id,
            "name": user.full_name,
            "email": user.email,
            "contract_count": user.contract_count,
        }
        for user in most_active
    ]

    return UserMetricsResponse(
        total_users=total_users,
        active_users_30d=active_users_30d,
        new_users_this_month=new_users_this_month,
        user_engagement_score=user_engagement_score,
        contracts_per_user=contracts_per_user,
        most_active_users=most_active_users,
    )


@router.get("/contract-types", response_model=List[ContractTypeMetrics])
@cache_analytics_result(ttl_seconds=300)  # Cache for 5 minutes
@log_query_performance("get_contract_type_metrics")
async def get_contract_type_metrics(
    company: Company = Depends(get_user_company), db: Session = Depends(get_db)
):
    """Get contract type distribution metrics"""

    # OPTIMIZED: Single query to get contract stats and compliance scores using JOINs
    type_stats = (
        db.query(
            Contract.contract_type,
            func.count(Contract.id).label("count"),
            func.sum(Contract.contract_value).label("total_value"),
            func.avg(Contract.contract_value).label("avg_value"),
            func.avg(ComplianceScore.overall_score).label("compliance_avg"),
        )
        .outerjoin(ComplianceScore, Contract.id == ComplianceScore.contract_id)
        .filter(Contract.company_id == company.id, Contract.is_current_version)
        .group_by(Contract.contract_type)
        .all()
    )

    total_contracts = sum(stat.count for stat in type_stats)

    results = []
    for stat in type_stats:
        results.append(
            ContractTypeMetrics(
                contract_type=stat.contract_type.value,
                count=stat.count,
                percentage=(
                    (stat.count / total_contracts * 100) if total_contracts > 0 else 0
                ),
                total_value=float(stat.total_value) if stat.total_value else 0.0,
                average_value=float(stat.avg_value) if stat.avg_value else 0.0,
                compliance_score=float(stat.compliance_avg) if stat.compliance_avg else None,
            )
        )

    return results


@router.get("/time-series/{metric}", response_model=TimeSeriesResponse)
async def get_time_series_metrics(
    metric: str,
    period: MetricPeriod = Query(MetricPeriod.MONTHLY),
    days: int = Query(30, ge=7, le=365),
    company: Company = Depends(get_user_company),
    db: Session = Depends(get_db),
):
    """Get time series metrics"""

    end_date = get_current_utc().date()
    start_date = end_date - timedelta(days=days)

    if metric == "contracts_created":
        # Group contracts by creation date - SQLite compatible
        if period == MetricPeriod.DAILY:
            date_format = func.date(Contract.created_at)
        elif period == MetricPeriod.WEEKLY:
            # SQLite: Use strftime to get year and week
            date_format = func.strftime("%Y-%W", Contract.created_at)
        else:  # monthly
            # SQLite: Use strftime to get year and month
            date_format = func.strftime("%Y-%m", Contract.created_at)

        results = (
            db.query(date_format.label("date"), func.count(Contract.id).label("count"))
            .filter(
                Contract.company_id == company.id, Contract.created_at >= start_date
            )
            .group_by(date_format)
            .order_by(date_format)
            .all()
        )

    elif metric == "contract_value":
        # Group by value creation date - SQLite compatible
        if period == MetricPeriod.DAILY:
            date_format = func.date(Contract.created_at)
        elif period == MetricPeriod.WEEKLY:
            # SQLite: Use strftime to get year and week
            date_format = func.strftime("%Y-%W", Contract.created_at)
        else:  # monthly
            # SQLite: Use strftime to get year and month
            date_format = func.strftime("%Y-%m", Contract.created_at)

        results = (
            db.query(
                date_format.label("date"),
                func.sum(Contract.contract_value).label("value"),
                func.count(Contract.id).label("count"),
            )
            .filter(
                Contract.company_id == company.id,
                Contract.created_at >= start_date,
                Contract.contract_value.isnot(None),
            )
            .group_by(date_format)
            .order_by(date_format)
            .all()
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown metric: {metric}"
        )

    # Convert to data points
    data_points = []
    for result in results:
        # Handle different date formats from SQLite strftime
        if isinstance(result.date, str):
            if period == MetricPeriod.WEEKLY:
                # Convert "2025-36" format to first day of that week
                try:
                    year, week = result.date.split('-')
                    # Calculate first day of the week (Monday)
                    jan_1 = datetime(int(year), 1, 1).date()
                    # Find the first Monday of the year
                    days_to_monday = (7 - jan_1.weekday()) % 7
                    first_monday = jan_1 + timedelta(days=days_to_monday)
                    # Add weeks to get to the target week
                    target_date = first_monday + timedelta(weeks=int(week)-1)
                    date_value = target_date
                except (ValueError, IndexError):
                    # Fallback to start_date if parsing fails
                    date_value = start_date
            elif period == MetricPeriod.MONTHLY:
                # Convert "2025-09" format to first day of month
                try:
                    year, month = result.date.split('-')
                    date_value = dt_date(int(year), int(month), 1)
                except (ValueError, IndexError):
                    # Fallback to start_date if parsing fails
                    date_value = start_date
            else:
                # Should be daily format, try to parse as date
                try:
                    date_value = datetime.strptime(result.date, '%Y-%m-%d').date()
                except ValueError:
                    date_value = start_date
        else:
            # Handle datetime objects
            date_value = result.date.date() if hasattr(result.date, "date") else result.date
        
        data_points.append(
            TimeSeriesDataPoint(
                date=date_value,
                value=float(result.value if hasattr(result, "value") else result.count),
                count=getattr(result, "count", None),
            )
        )

    # Calculate totals and trends
    total = sum(dp.value for dp in data_points)
    average = total / len(data_points) if data_points else 0

    # Simple trend calculation (last vs first half)
    trend_direction = "stable"
    trend_percentage = 0.0

    if len(data_points) >= 4:
        mid_point = len(data_points) // 2
        first_half_avg = sum(dp.value for dp in data_points[:mid_point]) / mid_point
        second_half_avg = sum(dp.value for dp in data_points[mid_point:]) / (
            len(data_points) - mid_point
        )

        if first_half_avg > 0:
            trend_percentage = (
                (second_half_avg - first_half_avg) / first_half_avg
            ) * 100
            if abs(trend_percentage) > 5:  # 5% threshold
                trend_direction = "up" if trend_percentage > 0 else "down"

    return TimeSeriesResponse(
        metric_name=metric,
        period=period.value,
        data_points=data_points,
        total=total,
        average=average,
        trend_direction=trend_direction,
        trend_percentage=trend_percentage,
    )


@router.get("/compliance", response_model=ComplianceMetricsResponse)
@cache_analytics_result(ttl_seconds=300)  # Cache for 5 minutes
@log_query_performance("get_compliance_metrics")
async def get_compliance_metrics(
    company: Company = Depends(get_user_company), db: Session = Depends(get_db)
):
    """Get compliance metrics for company"""

    # OPTIMIZED: Single query for compliance averages and risk distribution
    compliance_stats = (
        db.query(
            func.avg(ComplianceScore.overall_score).label("overall"),
            func.avg(ComplianceScore.gdpr_compliance).label("gdpr"),
            func.avg(ComplianceScore.employment_law_compliance).label("employment"),
            func.avg(ComplianceScore.consumer_rights_compliance).label("consumer"),
            func.avg(ComplianceScore.commercial_terms_compliance).label("commercial"),
            # Risk distribution using conditional aggregation
            func.sum(
                case(
                    (ComplianceScore.risk_score >= 7, 1),
                    else_=0
                )
            ).label("high_risk"),
            func.sum(
                case(
                    ((ComplianceScore.risk_score >= 4) & (ComplianceScore.risk_score < 7), 1),
                    else_=0
                )
            ).label("medium_risk"),
            func.sum(
                case(
                    (ComplianceScore.risk_score < 4, 1),
                    else_=0
                )
            ).label("low_risk"),
        )
        .join(Contract)
        .filter(Contract.company_id == company.id)
        .first()
    )

    # OPTIMIZED: Separate query for recent trend and recommendations count
    thirty_days_ago = get_current_utc() - timedelta(days=30)
    trend_and_recommendations = (
        db.query(
            func.avg(
                case(
                    (ComplianceScore.analysis_date >= thirty_days_ago, ComplianceScore.overall_score),
                    else_=None
                )
            ).label("recent_avg"),
            func.sum(func.json_array_length(ComplianceScore.recommendations)).label("recommendations_count"),
        )
        .join(Contract)
        .filter(Contract.company_id == company.id)
        .first()
    )

    # Extract results
    high_risk = compliance_stats.high_risk or 0
    medium_risk = compliance_stats.medium_risk or 0
    low_risk = compliance_stats.low_risk or 0
    
    overall_avg = float(compliance_stats.overall) if compliance_stats.overall else 0.8
    recent_avg = float(trend_and_recommendations.recent_avg) if trend_and_recommendations.recent_avg else overall_avg
    
    # Calculate trend
    trend = "stable"
    if recent_avg > overall_avg + 0.05:
        trend = "improving"
    elif recent_avg < overall_avg - 0.05:
        trend = "declining"

    recommendations_count = int(trend_and_recommendations.recommendations_count) if trend_and_recommendations.recommendations_count else 0

    return ComplianceMetricsResponse(
        overall_compliance_average=overall_avg,
        gdpr_compliance_average=(
            float(compliance_stats.gdpr) if compliance_stats.gdpr else 0.8
        ),
        employment_law_compliance_average=(
            float(compliance_stats.employment) if compliance_stats.employment else 0.8
        ),
        consumer_rights_compliance_average=(
            float(compliance_stats.consumer) if compliance_stats.consumer else 0.8
        ),
        commercial_terms_compliance_average=(
            float(compliance_stats.commercial) if compliance_stats.commercial else 0.8
        ),
        high_risk_contracts_count=high_risk,
        medium_risk_contracts_count=medium_risk,
        low_risk_contracts_count=low_risk,
        compliance_trend=trend,
        recommendations_count=int(recommendations_count),
    )


@router.get("/system/health", response_model=SystemHealthResponse)
async def get_system_health(
    current_user: User = Depends(get_admin_user), db: Session = Depends(get_db)
):
    """Get system health metrics (admin only)"""

    # Mock system health data (in production, integrate with actual monitoring)
    uptime_percentage = 99.9
    average_response_time_ms = 89.5
    total_requests_24h = 1250
    error_rate_percentage = 0.1
    active_sessions = 45
    peak_concurrent_users = 78

    # Check AI service health
    try:
        ai_health = await ai_service.health_check()
        ai_service_health = ai_health.get("status", "unknown")
    except Exception:
        ai_service_health = "unhealthy"

    # Simple database health check
    try:
        db.execute(text("SELECT 1"))
        database_health = "healthy"
    except Exception:
        database_health = "unhealthy"

    return SystemHealthResponse(
        uptime_percentage=uptime_percentage,
        average_response_time_ms=average_response_time_ms,
        total_requests_24h=total_requests_24h,
        error_rate_percentage=error_rate_percentage,
        ai_service_health=ai_service_health,
        database_health=database_health,
        active_sessions=active_sessions,
        peak_concurrent_users=peak_concurrent_users,
    )


from app.services.analytics_cache_service import analytics_cache
from app.services.query_performance_monitor import query_monitor

@router.get("/performance/cache-stats")
async def get_cache_stats(current_user: User = Depends(get_admin_user)):
    """Get analytics cache performance statistics (admin only)"""
    return analytics_cache.get_cache_stats()

@router.get("/performance/query-stats")
async def get_query_performance_stats(current_user: User = Depends(get_admin_user)):
    """Get query performance statistics (admin only)"""
    return query_monitor.get_performance_report()

@router.post("/performance/clear-cache")
async def clear_analytics_cache(current_user: User = Depends(get_admin_user)):
    """Clear analytics cache (admin only)"""
    await analytics_cache.invalidate()
    return {"message": "Analytics cache cleared successfully"}

@router.post("/performance/reset-query-stats")
async def reset_query_performance_stats(current_user: User = Depends(get_admin_user)):
    """Reset query performance statistics (admin only)"""
    query_monitor.reset_stats()
    return {"message": "Query performance statistics reset"}


@router.get("/performance", response_model=PerformanceMetricsResponse)
async def get_performance_metrics(
    current_user: User = Depends(get_admin_user), db: Session = Depends(get_db)
):
    """Get performance metrics (admin only)"""

    # AI generation performance
    ai_stats = (
        db.query(
            func.avg(AIGeneration.processing_time_ms).label("avg_time"),
            func.sum(
                func.json_extract(AIGeneration.token_usage, "$.total_tokens").cast(
                    db.Integer
                )
            ).label("total_tokens"),
            func.avg(
                func.json_extract(AIGeneration.token_usage, "$.total_tokens").cast(
                    db.Integer
                )
            ).label("avg_tokens"),
            func.count(AIGeneration.id).label("total_requests"),
        )
        .filter(AIGeneration.created_at >= get_current_utc() - timedelta(days=7))
        .first()
    )

    ai_generation_avg_time = float(ai_stats.avg_time) if ai_stats.avg_time else 0.0
    token_usage_total = int(ai_stats.total_tokens) if ai_stats.total_tokens else 0
    token_usage_avg = float(ai_stats.avg_tokens) if ai_stats.avg_tokens else 0.0

    # Compliance analysis performance (simplified)
    compliance_avg_time = ai_generation_avg_time * 0.8  # Assuming compliance is faster

    # Mock API response times
    api_response_times = {
        "/auth/login": 45.2,
        "/contracts": 89.1,
        "/contracts/{id}/generate": ai_generation_avg_time,
        "/contracts/{id}/analyze": compliance_avg_time,
    }

    # Mock success rates
    success_rates = {
        "/auth/login": 99.8,
        "/contracts": 99.9,
        "/contracts/{id}/generate": 98.5,
        "/contracts/{id}/analyze": 97.2,
    }

    return PerformanceMetricsResponse(
        ai_generation_average_time_ms=ai_generation_avg_time,
        compliance_analysis_average_time_ms=compliance_avg_time,
        api_response_times=api_response_times,
        success_rates=success_rates,
        token_usage_total=token_usage_total,
        token_usage_average_per_request=token_usage_avg,
    )
