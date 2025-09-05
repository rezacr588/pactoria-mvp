"""
Company Management API Endpoints
RESTful API for UK business/company operations
Supports company registration, verification, and management
"""
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field, validator
from datetime import datetime

from app.application.services.company_application_service import (
    CompanyApplicationService, CompanyRegistrationRequest, CompanyUpdateRequest
)
from app.core.auth import get_current_user
from app.core.responses import SuccessResponse, ErrorResponse
from app.domain.exceptions import (
    CompanyNotFoundError, BusinessRuleViolationError, DomainValidationError
)
from app.domain.entities.company import CompanyType, IndustryType, CompanySize


router = APIRouter(prefix="/companies", tags=["companies"])


# Pydantic models for API
class CompanyRegistrationSchema(BaseModel):
    """Schema for company registration requests"""
    name: str = Field(..., min_length=2, max_length=160, description="Company name")
    company_type: str = Field(..., description="UK company legal structure")
    industry: str = Field(..., description="Industry classification")
    primary_contact_email: str = Field(..., description="Primary contact email")
    address_line1: str = Field(..., min_length=1, description="Address line 1")
    address_line2: Optional[str] = Field(None, description="Address line 2")
    city: str = Field(..., min_length=1, description="City")
    county: Optional[str] = Field(None, description="County")
    postcode: str = Field(..., description="UK postcode")
    company_number: Optional[str] = Field(None, description="Companies House number")
    vat_number: Optional[str] = Field(None, description="UK VAT number")
    phone_number: Optional[str] = Field(None, description="Company phone number")
    website: Optional[str] = Field(None, description="Company website")

    @validator('company_type')
    def validate_company_type(cls, v):
        try:
            CompanyType(v)
            return v
        except ValueError:
            raise ValueError('Invalid company type')

    @validator('industry')
    def validate_industry(cls, v):
        try:
            IndustryType(v)
            return v
        except ValueError:
            raise ValueError('Invalid industry type')


class CompanyUpdateSchema(BaseModel):
    """Schema for company update requests"""
    name: Optional[str] = Field(None, min_length=2, max_length=160)
    primary_contact_email: Optional[str] = Field(None)
    phone_number: Optional[str] = Field(None)
    website: Optional[str] = Field(None)
    address_line1: Optional[str] = Field(None)
    address_line2: Optional[str] = Field(None)
    city: Optional[str] = Field(None)
    county: Optional[str] = Field(None)
    postcode: Optional[str] = Field(None)
    vat_number: Optional[str] = Field(None)
    company_size: Optional[str] = Field(None)

    @validator('company_size')
    def validate_company_size(cls, v):
        if v is not None:
            try:
                CompanySize(v)
                return v
            except ValueError:
                raise ValueError('Invalid company size')
        return v


class SubscriptionUpgradeSchema(BaseModel):
    """Schema for subscription upgrade requests"""
    new_tier: str = Field(..., description="New subscription tier")

    @validator('new_tier')
    def validate_tier(cls, v):
        if v not in ["starter", "professional", "enterprise"]:
            raise ValueError('Invalid subscription tier')
        return v


class CompanySearchSchema(BaseModel):
    """Schema for company search responses"""
    id: str
    name: str
    company_type: str
    industry: str
    company_size: str
    is_verified: bool
    postcode: str
    subscription_tier: str
    created_at: str


class CompanyDetailSchema(BaseModel):
    """Schema for detailed company information"""
    id: str
    name: str
    company_type: str
    company_number: Optional[str]
    vat_number: Optional[str]
    industry: str
    company_size: str
    status: str
    primary_contact_email: str
    phone_number: Optional[str]
    website: Optional[str]
    address: Dict[str, Any]
    subscription_tier: str
    max_team_members: int
    max_contracts_per_month: int
    monthly_contract_count: int
    is_verified: bool
    verified_at: Optional[str]
    is_vat_registered: bool
    compliance_requirements: List[str]
    applicable_regulations: List[str]
    is_sme_eligible: bool
    features_enabled: List[str]
    created_by_user_id: str
    created_at: str
    updated_at: Optional[str]
    version: int


# Dependencies
async def get_company_service() -> CompanyApplicationService:
    """Dependency to get company application service"""
    # This would be injected via DI container in production
    # For now, we'll import the factory
    from app.application.services.service_factory import create_company_service
    return await create_company_service()


# API Endpoints
@router.post(
    "",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new company",
    description="Register a new UK business with company details and address"
)
async def register_company(
    registration_data: CompanyRegistrationSchema,
    current_user: Dict = Depends(get_current_user),
    service: CompanyApplicationService = Depends(get_company_service)
):
    """Register a new company in the system"""
    try:
        request = CompanyRegistrationRequest(
            name=registration_data.name,
            company_type=registration_data.company_type,
            industry=registration_data.industry,
            primary_contact_email=registration_data.primary_contact_email,
            address_line1=registration_data.address_line1,
            address_line2=registration_data.address_line2,
            city=registration_data.city,
            county=registration_data.county,
            postcode=registration_data.postcode,
            created_by_user_id=current_user["id"],
            company_number=registration_data.company_number,
            vat_number=registration_data.vat_number,
            phone_number=registration_data.phone_number,
            website=registration_data.website
        )
        
        company_id = await service.register_company(request)
        
        return SuccessResponse(
            message="Company registered successfully",
            data={"company_id": company_id}
        )
        
    except DomainValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation error: {str(e)}"
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Business rule violation: {str(e)}"
        )


@router.get(
    "/{company_id}",
    response_model=SuccessResponse,
    summary="Get company details",
    description="Retrieve detailed information about a specific company"
)
async def get_company(
    company_id: str,
    current_user: Dict = Depends(get_current_user),
    service: CompanyApplicationService = Depends(get_company_service)
):
    """Get company by ID"""
    try:
        company = await service.get_company(company_id)
        
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        
        return SuccessResponse(
            message="Company retrieved successfully",
            data=company
        )
        
    except CompanyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )


@router.put(
    "/{company_id}",
    response_model=SuccessResponse,
    summary="Update company details",
    description="Update company information including address and contact details"
)
async def update_company(
    company_id: str,
    update_data: CompanyUpdateSchema,
    current_user: Dict = Depends(get_current_user),
    service: CompanyApplicationService = Depends(get_company_service)
):
    """Update company information"""
    try:
        request = CompanyUpdateRequest(
            company_id=company_id,
            updated_by_user_id=current_user["id"],
            name=update_data.name,
            primary_contact_email=update_data.primary_contact_email,
            phone_number=update_data.phone_number,
            website=update_data.website,
            address_line1=update_data.address_line1,
            address_line2=update_data.address_line2,
            city=update_data.city,
            county=update_data.county,
            postcode=update_data.postcode,
            vat_number=update_data.vat_number,
            company_size=update_data.company_size
        )
        
        await service.update_company(request)
        
        return SuccessResponse(
            message="Company updated successfully"
        )
        
    except CompanyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    except DomainValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation error: {str(e)}"
        )


@router.post(
    "/{company_id}/verify",
    response_model=SuccessResponse,
    summary="Verify company with Companies House",
    description="Verify company details against UK Companies House registry"
)
async def verify_company(
    company_id: str,
    current_user: Dict = Depends(get_current_user),
    service: CompanyApplicationService = Depends(get_company_service)
):
    """Verify company with Companies House"""
    try:
        success = await service.verify_company_with_companies_house(
            company_id, current_user["id"]
        )
        
        return SuccessResponse(
            message="Company verification completed successfully",
            data={"verified": success}
        )
        
    except CompanyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/{company_id}/subscription/upgrade",
    response_model=SuccessResponse,
    summary="Upgrade subscription tier",
    description="Upgrade company subscription to a higher tier"
)
async def upgrade_subscription(
    company_id: str,
    upgrade_data: SubscriptionUpgradeSchema,
    current_user: Dict = Depends(get_current_user),
    service: CompanyApplicationService = Depends(get_company_service)
):
    """Upgrade company subscription"""
    try:
        await service.upgrade_subscription(
            company_id, upgrade_data.new_tier, current_user["id"]
        )
        
        return SuccessResponse(
            message=f"Subscription upgraded to {upgrade_data.new_tier}"
        )
        
    except CompanyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "",
    response_model=SuccessResponse,
    summary="Search companies",
    description="Search and filter companies with pagination"
)
async def search_companies(
    q: Optional[str] = Query(None, description="Search query"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    company_size: Optional[str] = Query(None, description="Filter by company size"),
    is_verified: Optional[bool] = Query(None, description="Filter by verification status"),
    subscription_tier: Optional[str] = Query(None, description="Filter by subscription tier"),
    postcode: Optional[str] = Query(None, description="Filter by postcode prefix"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results per page"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: Dict = Depends(get_current_user),
    service: CompanyApplicationService = Depends(get_company_service)
):
    """Search companies with filters"""
    try:
        filters = {}
        if industry:
            filters["industry"] = industry
        if company_size:
            filters["company_size"] = company_size
        if is_verified is not None:
            filters["is_verified"] = is_verified
        if subscription_tier:
            filters["subscription_tier"] = subscription_tier
        if postcode:
            filters["postcode"] = postcode
        
        companies = await service.search_companies(
            query=q or "",
            filters=filters,
            limit=limit,
            offset=offset
        )
        
        return SuccessResponse(
            message="Companies retrieved successfully",
            data={
                "companies": companies,
                "count": len(companies),
                "limit": limit,
                "offset": offset
            }
        )
        
    except DomainValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/user/{user_id}/companies",
    response_model=SuccessResponse,
    summary="Get user's companies",
    description="Get all companies created by a specific user"
)
async def get_user_companies(
    user_id: str,
    current_user: Dict = Depends(get_current_user),
    service: CompanyApplicationService = Depends(get_company_service)
):
    """Get companies by user"""
    # Basic authorization - users can only see their own companies unless admin
    if current_user["id"] != user_id and not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    companies = await service.get_companies_by_user(user_id)
    
    return SuccessResponse(
        message="User companies retrieved successfully",
        data={"companies": companies, "count": len(companies)}
    )


@router.get(
    "/industry/{industry}/companies",
    response_model=SuccessResponse,
    summary="Get companies by industry",
    description="Get all companies in a specific industry"
)
async def get_companies_by_industry(
    industry: str,
    current_user: Dict = Depends(get_current_user),
    service: CompanyApplicationService = Depends(get_company_service)
):
    """Get companies by industry"""
    try:
        companies = await service.get_companies_by_industry(industry)
        
        return SuccessResponse(
            message=f"Companies in {industry} industry retrieved successfully",
            data={"companies": companies, "count": len(companies)}
        )
        
    except DomainValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/statistics",
    response_model=SuccessResponse,
    summary="Get company statistics",
    description="Get overall statistics about companies in the system"
)
async def get_company_statistics(
    current_user: Dict = Depends(get_current_user),
    service: CompanyApplicationService = Depends(get_company_service)
):
    """Get company statistics (admin only)"""
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    stats = await service.get_company_statistics()
    
    return SuccessResponse(
        message="Company statistics retrieved successfully",
        data=stats
    )


@router.get(
    "/compliance/monitoring",
    response_model=SuccessResponse,
    summary="Get compliance monitoring alerts",
    description="Get companies requiring compliance attention (admin only)"
)
async def get_compliance_monitoring(
    current_user: Dict = Depends(get_current_user),
    service: CompanyApplicationService = Depends(get_company_service)
):
    """Get compliance monitoring alerts"""
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    alerts = await service.process_compliance_monitoring()
    
    return SuccessResponse(
        message="Compliance monitoring data retrieved successfully",
        data={"alerts": alerts, "count": len(alerts)}
    )


# Additional utility endpoints
@router.get(
    "/enums/company-types",
    response_model=SuccessResponse,
    summary="Get available company types",
    description="Get list of supported UK company legal structures"
)
async def get_company_types():
    """Get available company types"""
    return SuccessResponse(
        message="Company types retrieved successfully",
        data={
            "company_types": [
                {"value": ct.value, "name": ct.value.replace("_", " ").title()}
                for ct in CompanyType
            ]
        }
    )


@router.get(
    "/enums/industries",
    response_model=SuccessResponse,
    summary="Get available industries",
    description="Get list of supported industry classifications"
)
async def get_industries():
    """Get available industries"""
    return SuccessResponse(
        message="Industries retrieved successfully",
        data={
            "industries": [
                {"value": ind.value, "name": ind.value.replace("_", " ").title()}
                for ind in IndustryType
            ]
        }
    )


@router.get(
    "/enums/company-sizes",
    response_model=SuccessResponse,
    summary="Get available company sizes",
    description="Get list of UK company size classifications"
)
async def get_company_sizes():
    """Get available company sizes"""
    return SuccessResponse(
        message="Company sizes retrieved successfully",
        data={
            "company_sizes": [
                {"value": cs.value, "name": cs.value.title()}
                for cs in CompanySize
            ]
        }
    )