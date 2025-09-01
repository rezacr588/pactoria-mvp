"""
Contract management endpoints for Pactoria MVP
CRUD operations, AI generation, and compliance analysis
"""
import uuid
from datetime import datetime
from app.core.datetime_utils import get_current_utc
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.core.database import get_db
from app.core.auth import get_current_user, require_company_access
from app.core.config import settings
from app.core.exceptions import APIExceptionFactory, ResourceNotFoundError, CompanyAccessError
from app.core.validation import ResourceValidator, AuditLogHelper
from app.infrastructure.database.models import (
    User, Contract, Template, AIGeneration, ComplianceScore, 
    ContractVersion, ContractType, ContractStatus, AuditLog
)
from app.schemas.contracts import (
    ContractCreate, ContractUpdate, ContractGenerate, ContractResponse,
    ContractListResponse, AIGenerationResponse, ComplianceScoreResponse,
    ContractVersionResponse, ContractAnalysisRequest, TemplateResponse,
    ContractSearchParams
)
from app.schemas.common import (
    ErrorResponse, ValidationError, UnauthorizedError, NotFoundError, 
    ForbiddenError
)
from fastapi.security import HTTPBearer

# Security scheme for OpenAPI documentation
security = HTTPBearer()
from app.services.ai_service import (
    ai_service, ContractGenerationRequest, ComplianceAnalysisRequest
)

router = APIRouter(prefix="/contracts", tags=["Contracts"])


@router.post(
    "/", 
    response_model=ContractResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Create New Contract",
    description="""
    Create a new contract for the authenticated user's company.
    
    **Key Features:**
    - Creates contract in DRAFT status for editing
    - Associates contract with user's company
    - Optional template-based contract creation
    - Comprehensive contract metadata tracking
    - Automatic version control (starts at version 1)
    - Full audit trail creation
    
    **Business Rules:**
    - User must be associated with a company
    - Template (if specified) must exist and be active
    - Contract value and currency are optional but recommended
    - Start and end dates help with compliance tracking
    - All contracts start in DRAFT status
    
    **Requires Authentication:** JWT Bearer token
    """,
    responses={
        201: {
            "description": "Contract created successfully",
            "model": ContractResponse
        },
        400: {
            "description": "Invalid contract data or template not found",
            "model": ErrorResponse
        },
        401: {
            "description": "Authentication required",
            "model": UnauthorizedError
        },
        403: {
            "description": "User not associated with company",
            "model": ForbiddenError
        },
        422: {
            "description": "Validation error in contract data",
            "model": ValidationError
        }
    },
    dependencies=[Depends(security)]
)
async def create_contract(
    contract_data: ContractCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new contract"""
    
    ResourceValidator.validate_user_has_company(current_user)
    
    # Check if template exists and belongs to company or is public
    template = None
    if contract_data.template_id:
        template = db.query(Template).filter(Template.id == contract_data.template_id).first()
        if not template or not template.is_active:
            raise APIExceptionFactory.not_found("Template", contract_data.template_id)
    
    # Create contract
    contract = Contract(
        title=contract_data.title,
        contract_type=ContractType(contract_data.contract_type),
        status=ContractStatus.DRAFT,
        plain_english_input=contract_data.plain_english_input,
        client_name=contract_data.client_name,
        client_email=contract_data.client_email,
        supplier_name=contract_data.supplier_name,
        contract_value=contract_data.contract_value,
        currency=contract_data.currency,
        start_date=contract_data.start_date,
        end_date=contract_data.end_date,
        company_id=current_user.company_id,
        template_id=contract_data.template_id,
        created_by=current_user.id,
        version=1,
        is_current_version=True
    )
    
    db.add(contract)
    db.commit()
    db.refresh(contract)
    
    # Create audit log
    audit_log = AuditLog(
        event_type="contract_created",
        resource_type="contract",
        resource_id=contract.id,
        user_id=current_user.id,
        new_values={
            "title": contract.title,
            "contract_type": contract.contract_type.value,
            "status": contract.status.value
        },
        contract_id=contract.id
    )
    db.add(audit_log)
    db.commit()
    
    return ContractResponse.model_validate(contract)


@router.get(
    "/", 
    response_model=ContractListResponse,
    summary="List Company Contracts",
    description="""
    Retrieve paginated list of contracts for the authenticated user's company.
    
    **Key Features:**
    - Paginated results with configurable page size (1-100 contracts per page)
    - Filter by contract type (service_agreement, employment_contract, etc.)
    - Filter by contract status (draft, active, completed, expired, terminated)
    - Full-text search across title, client name, supplier name, and description
    - Results sorted by creation date (newest first)
    - Only returns current version of contracts
    
    **Query Parameters:**
    - `page`: Page number (default: 1, minimum: 1)
    - `size`: Number of contracts per page (default: 10, range: 1-100)
    - `contract_type`: Filter by contract type (optional)
    - `status`: Filter by contract status (optional)
    - `search`: Search term to match against contract fields (optional)
    
    **Example Queries:**
    - `GET /api/v1/contracts/` - Get first page of all contracts
    - `GET /api/v1/contracts/?page=2&size=25` - Get 25 contracts on page 2
    - `GET /api/v1/contracts/?contract_type=service_agreement&status=active` - Get active service agreements
    - `GET /api/v1/contracts/?search=consulting` - Search for contracts containing "consulting"
    
    **Requires Authentication:** JWT Bearer token
    **Requires Company:** User must be associated with a company
    """,
    responses={
        200: {
            "description": "Contracts retrieved successfully",
            "model": ContractListResponse,
            "content": {
                "application/json": {
                    "example": {
                        "contracts": [
                            {
                                "id": "contract-12345",
                                "title": "Professional Services Agreement",
                                "contract_type": "service_agreement",
                                "status": "active",
                                "client_name": "ABC Corp Ltd",
                                "contract_value": 50000.00,
                                "currency": "GBP",
                                "created_at": "2024-01-15T10:30:00Z",
                                "updated_at": "2024-01-15T10:30:00Z"
                            }
                        ],
                        "total": 47,
                        "page": 1,
                        "size": 10,
                        "pages": 5
                    }
                }
            }
        },
        401: {
            "description": "Authentication required",
            "model": UnauthorizedError
        },
        403: {
            "description": "User not associated with company",
            "model": ForbiddenError
        },
        422: {
            "description": "Invalid query parameters",
            "model": ValidationError
        }
    },
    dependencies=[Depends(security)]
)
async def list_contracts(
    page: int = Query(1, ge=1, description="Page number for pagination"),
    size: int = Query(10, ge=1, le=100, description="Number of contracts per page (max 100)"),
    contract_type: Optional[str] = Query(None, description="Filter by contract type (service_agreement, employment_contract, etc.)"),
    status: Optional[str] = Query(None, description="Filter by contract status (draft, active, completed, expired, terminated)"),
    search: Optional[str] = Query(None, description="Search term to match against contract title, client name, supplier name, or description"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List contracts for user's company with pagination and filtering"""
    
    ResourceValidator.validate_user_has_company(current_user)
    
    # Build query
    query = db.query(Contract).filter(
        Contract.company_id == current_user.company_id,
        Contract.is_current_version == True
    )
    
    # Apply filters
    if contract_type:
        query = query.filter(Contract.contract_type == ContractType(contract_type))
    
    if status:
        query = query.filter(Contract.status == ContractStatus(status))
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Contract.title.ilike(search_term),
                Contract.client_name.ilike(search_term),
                Contract.supplier_name.ilike(search_term),
                Contract.plain_english_input.ilike(search_term)
            )
        )
    
    # Count total
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * size
    contracts = query.order_by(Contract.created_at.desc()).offset(offset).limit(size).all()
    
    # Calculate pages
    pages = (total + size - 1) // size
    
    return ContractListResponse(
        contracts=[ContractResponse.model_validate(c) for c in contracts],
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.get(
    "/{contract_id}", 
    response_model=ContractResponse,
    summary="Get Contract by ID",
    description="""
    Retrieve detailed information for a specific contract by its unique identifier.
    
    **Key Features:**
    - Returns complete contract details including all metadata
    - Includes compliance scores and AI generation data if available
    - Shows contract versions and audit trail
    - Enforces company access control - users can only access their company's contracts
    
    **Path Parameters:**
    - `contract_id`: Unique identifier of the contract (UUID format)
    
    **Response Data Includes:**
    - Contract basic information (title, type, status, dates)
    - Client and supplier details
    - Financial information (value, currency)
    - Generated and final content
    - Compliance and risk scores
    - Version control information
    - Creation and modification timestamps
    - Associated template information
    
    **Use Cases:**
    - Display contract details in frontend
    - Download contract content for editing
    - Review compliance scores and recommendations
    - Track contract status and history
    
    **Requires Authentication:** JWT Bearer token
    **Requires Company Access:** User must belong to the same company as the contract
    """,
    responses={
        200: {
            "description": "Contract retrieved successfully",
            "model": ContractResponse,
            "content": {
                "application/json": {
                    "example": {
                        "id": "contract-12345",
                        "title": "Professional Services Agreement with TechCorp",
                        "contract_type": "service_agreement",
                        "status": "active",
                        "client_name": "TechCorp Ltd",
                        "client_email": "legal@techcorp.com",
                        "supplier_name": "My Consultancy Ltd",
                        "supplier_email": "contact@myconsultancy.com",
                        "contract_value": 75000.00,
                        "currency": "GBP",
                        "start_date": "2024-02-01T00:00:00Z",
                        "end_date": "2024-12-31T23:59:59Z",
                        "plain_english_input": "Need consulting agreement for software development project...",
                        "generated_content": "PROFESSIONAL SERVICES AGREEMENT\\n\\nThis agreement...",
                        "final_content": "PROFESSIONAL SERVICES AGREEMENT\\n\\nThis agreement...",
                        "version": 1,
                        "compliance_score": 0.92,
                        "risk_score": 3,
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-16T14:22:00Z"
                    }
                }
            }
        },
        401: {
            "description": "Authentication required",
            "model": UnauthorizedError
        },
        403: {
            "description": "Access forbidden - contract belongs to different company",
            "model": ForbiddenError
        },
        404: {
            "description": "Contract not found",
            "model": NotFoundError
        }
    },
    dependencies=[Depends(security)]
)
async def get_contract(
    contract_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed contract information by ID with company access control"""
    
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    # Check company access
    require_company_access(current_user, contract.company_id)
    
    return ContractResponse.model_validate(contract)


@router.put("/{contract_id}", response_model=ContractResponse)
async def update_contract(
    contract_id: str,
    contract_data: ContractUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update contract"""
    
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    # Check company access
    require_company_access(current_user, contract.company_id)
    
    # Store old values for audit
    old_values = {
        "title": contract.title,
        "status": contract.status.value if contract.status else None,
        "client_name": contract.client_name,
        "supplier_name": contract.supplier_name,
        "contract_value": contract.contract_value
    }
    
    # Update fields
    if contract_data.title is not None:
        contract.title = contract_data.title
    if contract_data.status is not None:
        contract.status = ContractStatus(contract_data.status.value)
    if contract_data.client_name is not None:
        contract.client_name = contract_data.client_name
    if contract_data.client_email is not None:
        contract.client_email = contract_data.client_email
    if contract_data.supplier_name is not None:
        contract.supplier_name = contract_data.supplier_name
    if contract_data.contract_value is not None:
        contract.contract_value = contract_data.contract_value
    if contract_data.currency is not None:
        contract.currency = contract_data.currency
    if contract_data.start_date is not None:
        contract.start_date = contract_data.start_date
    if contract_data.end_date is not None:
        contract.end_date = contract_data.end_date
    if contract_data.final_content is not None:
        contract.final_content = contract_data.final_content
    
    contract.updated_at = get_current_utc()
    
    db.commit()
    db.refresh(contract)
    
    # Create audit log
    new_values = {
        "title": contract.title,
        "status": contract.status.value if contract.status else None,
        "client_name": contract.client_name,
        "supplier_name": contract.supplier_name,
        "contract_value": contract.contract_value
    }
    
    audit_log = AuditLog(
        event_type="contract_updated",
        resource_type="contract",
        resource_id=contract.id,
        user_id=current_user.id,
        old_values=old_values,
        new_values=new_values,
        contract_id=contract.id
    )
    db.add(audit_log)
    db.commit()
    
    return ContractResponse.model_validate(contract)


@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contract(
    contract_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete contract (soft delete by marking inactive)"""
    
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    # Check company access
    require_company_access(current_user, contract.company_id)
    
    # Mark as terminated (soft delete)
    contract.status = ContractStatus.TERMINATED
    contract.updated_at = get_current_utc()
    
    db.commit()
    
    # Create audit log
    audit_log = AuditLog(
        event_type="contract_deleted",
        resource_type="contract",
        resource_id=contract.id,
        user_id=current_user.id,
        old_values={"status": "active"},
        new_values={"status": "terminated"},
        contract_id=contract.id
    )
    db.add(audit_log)
    db.commit()


@router.post("/{contract_id}/generate", response_model=AIGenerationResponse)
async def generate_contract_content(
    contract_id: str,
    generate_data: ContractGenerate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate contract content using AI"""
    
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    # Check company access
    require_company_access(current_user, contract.company_id)
    
    # Check if already generated and not forcing regeneration
    if contract.ai_generation_id and not generate_data.regenerate:
        existing_generation = db.query(AIGeneration).filter(
            AIGeneration.id == contract.ai_generation_id
        ).first()
        if existing_generation:
            return AIGenerationResponse.model_validate(existing_generation)
    
    # Prepare AI generation request
    ai_request = ContractGenerationRequest(
        plain_english_input=contract.plain_english_input,
        contract_type=contract.contract_type.value,
        client_name=contract.client_name,
        supplier_name=contract.supplier_name,
        contract_value=contract.contract_value,
        currency=contract.currency,
        start_date=contract.start_date.isoformat() if contract.start_date else None,
        end_date=contract.end_date.isoformat() if contract.end_date else None
    )
    
    try:
        # Generate content using AI service
        ai_response = await ai_service.generate_contract(ai_request)
        
        # Create AI generation record
        ai_generation = AIGeneration(
            model_name=ai_response.model_name,
            model_version=ai_response.model_version,
            input_prompt=f"Contract generation for {contract.contract_type.value}: {contract.plain_english_input}",
            generated_content=ai_response.content,
            processing_time_ms=ai_response.processing_time_ms,
            token_usage=ai_response.token_usage,
            confidence_score=ai_response.confidence_score
        )
        
        db.add(ai_generation)
        db.flush()
        
        # Update contract with generated content
        contract.generated_content = ai_response.content
        contract.ai_generation_id = ai_generation.id
        contract.updated_at = get_current_utc()
        
        db.commit()
        db.refresh(ai_generation)
        
        # Create audit log
        audit_log = AuditLog(
            event_type="contract_generated",
            resource_type="contract",
            resource_id=contract.id,
            user_id=current_user.id,
            new_values={
                "ai_generation_id": ai_generation.id,
                "model_name": ai_response.model_name
            },
            contract_id=contract.id
        )
        db.add(audit_log)
        db.commit()
        
        return AIGenerationResponse.model_validate(ai_generation)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate contract content: {str(e)}"
        )


@router.post("/{contract_id}/analyze/compliance", response_model=ComplianceScoreResponse)
async def analyze_contract_compliance_detailed(
    contract_id: str,
    analysis_data: ContractAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze contract for compliance (detailed endpoint)"""
    return await analyze_contract_compliance(contract_id, analysis_data, current_user, db)


@router.post("/{contract_id}/analyze", response_model=ComplianceScoreResponse)
async def analyze_contract_compliance(
    contract_id: str,
    analysis_data: ContractAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze contract for compliance"""
    
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    # Check company access
    require_company_access(current_user, contract.company_id)
    
    # Get content to analyze (prefer final_content, then generated_content)
    content_to_analyze = contract.final_content or contract.generated_content
    if not content_to_analyze:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contract has no content to analyze. Generate or add content first."
        )
    
    # Check if already analyzed and not forcing reanalysis
    if not analysis_data.force_reanalysis:
        existing_score = db.query(ComplianceScore).filter(
            ComplianceScore.contract_id == contract_id
        ).order_by(ComplianceScore.analysis_date.desc()).first()
        
        if existing_score:
            return ComplianceScoreResponse.model_validate(existing_score)
    
    # Prepare compliance analysis request
    compliance_request = ComplianceAnalysisRequest(
        contract_content=content_to_analyze,
        contract_type=contract.contract_type.value,
        jurisdiction="UK"
    )
    
    try:
        # Analyze using AI service
        compliance_response = await ai_service.analyze_compliance(compliance_request)
        
        # Create compliance score record
        compliance_score = ComplianceScore(
            contract_id=contract_id,
            overall_score=compliance_response.overall_score,
            gdpr_compliance=compliance_response.gdpr_compliance,
            employment_law_compliance=compliance_response.employment_law_compliance,
            consumer_rights_compliance=compliance_response.consumer_rights_compliance,
            commercial_terms_compliance=compliance_response.commercial_terms_compliance,
            risk_score=compliance_response.risk_score,
            risk_factors=compliance_response.risk_factors,
            recommendations=compliance_response.recommendations,
            analysis_version="1.0",
            analysis_raw=compliance_response.analysis_raw
        )
        
        db.add(compliance_score)
        db.commit()
        db.refresh(compliance_score)
        
        # Create audit log
        audit_log = AuditLog(
            event_type="compliance_analyzed",
            resource_type="contract",
            resource_id=contract.id,
            user_id=current_user.id,
            new_values={
                "overall_score": compliance_response.overall_score,
                "risk_score": compliance_response.risk_score
            },
            contract_id=contract.id
        )
        db.add(audit_log)
        db.commit()
        
        return ComplianceScoreResponse.model_validate(compliance_score)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze contract compliance: {str(e)}"
        )


@router.get("/{contract_id}/versions", response_model=List[ContractVersionResponse])
async def get_contract_versions(
    contract_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all versions of a contract"""
    
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    # Check company access
    require_company_access(current_user, contract.company_id)
    
    versions = db.query(ContractVersion).filter(
        ContractVersion.contract_id == contract_id
    ).order_by(ContractVersion.version_number.desc()).all()
    
    return [ContractVersionResponse.model_validate(v) for v in versions]


@router.get("/templates/", response_model=List[TemplateResponse])
async def list_templates(
    contract_type: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List available contract templates"""
    
    query = db.query(Template).filter(Template.is_active == True)
    
    if contract_type:
        query = query.filter(Template.contract_type == ContractType(contract_type))
    
    if category:
        query = query.filter(Template.category == category)
    
    templates = query.order_by(Template.name).all()
    
    return [TemplateResponse.model_validate(t) for t in templates]