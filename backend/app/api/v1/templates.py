"""
Contract templates management endpoints for Pactoria MVP
CRUD operations for contract templates
"""

from app.core.datetime_utils import get_current_utc
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.auth import get_admin_user
from app.core.exceptions import APIExceptionFactory
from app.infrastructure.database.models import User, Template, ContractType, AuditLog
from app.schemas.contracts import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    TemplateListResponse,
)
from app.schemas.common import (
    ValidationError,
    UnauthorizedError,
    NotFoundError,
    ForbiddenError,
)
from fastapi.security import HTTPBearer

# Security scheme for OpenAPI documentation
security = HTTPBearer()

router = APIRouter(prefix="/templates", tags=["Templates"])


@router.get(
    "/",
    response_model=TemplateListResponse,
    summary="List Contract Templates",
    description="""
    List all available contract templates for contract creation.

    **Features:**
    - Filter by contract type (employment, service_agreement, etc.)
    - Filter by category (legal, business, etc.)
    - Search by name and description
    - Only returns active templates
    - Pagination support
    - Suitable for template selection in contract creation

    **Template Categories:**
    - Employment contracts
    - Service agreements
    - Supply agreements
    - NDAs and confidentiality
    - Terms and conditions
    - Partnership agreements

    **Authentication:** Optional (public templates available to all)
    """,
    responses={
        200: {
            "description": "Templates retrieved successfully",
            "model": TemplateListResponse,
        }
    },
)
async def list_templates(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    contract_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List available contract templates"""

    # Build query for active templates
    query = db.query(Template).filter(Template.is_active)

    # Apply filters
    if contract_type:
        try:
            query = query.filter(Template.contract_type == ContractType(contract_type))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid contract type: {contract_type}",
            )

    if category:
        query = query.filter(Template.category == category)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Template.name.ilike(search_term),
                Template.description.ilike(search_term),
                Template.legal_notes.ilike(search_term),
            )
        )

    # Count total
    total = query.count()

    # Apply pagination
    offset = (page - 1) * size
    templates = query.order_by(Template.name).offset(offset).limit(size).all()

    # Calculate pages
    pages = (total + size - 1) // size

    return TemplateListResponse(
        templates=[TemplateResponse.model_validate(t) for t in templates],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get(
    "/categories/",
    response_model=List[str],
    summary="List Template Categories",
    description="""
    Get list of all available template categories.

    **Use Cases:**
    - Populating filter dropdowns
    - Template organization
    - Category-based browsing

    **Returns:** List of unique category names
    """,
)
async def list_template_categories(db: Session = Depends(get_db)):
    """List all template categories"""

    categories = (
        db.query(Template.category).filter(Template.is_active).distinct().all()
    )

    return [category[0] for category in categories if category[0]]


@router.get(
    "/contract-types/",
    response_model=List[str],
    summary="List Supported Contract Types",
    description="""
    Get list of all contract types that have templates available.

    **Use Cases:**
    - Contract creation workflow
    - Template filtering
    - Type validation

    **Returns:** List of contract type values
    """,
)
async def list_template_contract_types(db: Session = Depends(get_db)):
    """List contract types that have templates"""

    types = (
        db.query(Template.contract_type)
        .filter(Template.is_active)
        .distinct()
        .all()
    )

    return [type_enum.value for type_enum, in types if type_enum]


@router.get(
    "/{template_id}",
    response_model=TemplateResponse,
    summary="Get Template Details",
    description="""
    Get detailed information about a specific contract template.

    **Returns:**
    - Complete template content and metadata
    - Compliance features and legal notes
    - Suitable use cases
    - Version information

    **Use Cases:**
    - Template preview before contract creation
    - Understanding compliance features
    - Checking legal notes and recommendations
    """,
    responses={
        200: {
            "description": "Template retrieved successfully",
            "model": TemplateResponse,
        },
        404: {"description": "Template not found or inactive", "model": NotFoundError},
    },
)
async def get_template(template_id: str, db: Session = Depends(get_db)):
    """Get template by ID"""

    template = (
        db.query(Template)
        .filter(Template.id == template_id, Template.is_active)
        .first()
    )

    if not template:
        raise APIExceptionFactory.not_found("Template", template_id)

    return TemplateResponse.model_validate(template)


@router.post(
    "/",
    response_model=TemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Template",
    description="""
    Create a new contract template (Admin only).

    **Features:**
    - Complete template content with variables
    - Compliance features tracking
    - Legal notes and recommendations
    - Version control support
    - Category and type classification

    **Template Variables:**
    Templates can include variables like {{client_name}}, {{contract_value}}, etc.
    that will be replaced during contract generation.

    **Requires Authentication:** Admin user only
    """,
    responses={
        201: {
            "description": "Template created successfully",
            "model": TemplateResponse,
        },
        401: {"description": "Authentication required", "model": UnauthorizedError},
        403: {"description": "Admin access required", "model": ForbiddenError},
        422: {
            "description": "Validation error in template data",
            "model": ValidationError,
        },
    },
    dependencies=[Depends(security)],
)
async def create_template(
    template_data: TemplateCreate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Create new contract template (admin only)"""

    # Create template
    template = Template(
        name=template_data.name,
        category=template_data.category,
        contract_type=ContractType(template_data.contract_type),
        description=template_data.description,
        template_content=template_data.template_content,
        compliance_features=template_data.compliance_features or [],
        legal_notes=template_data.legal_notes,
        version=template_data.version or "1.0",
        is_active=True,
        suitable_for=template_data.suitable_for or [],
    )

    db.add(template)
    db.commit()
    db.refresh(template)

    # Create audit log
    audit_log = AuditLog(
        event_type="template_created",
        resource_type="template",
        resource_id=template.id,
        user_id=current_user.id,
        new_values={
            "name": template.name,
            "contract_type": template.contract_type.value,
            "category": template.category,
        },
    )
    db.add(audit_log)
    db.commit()

    return TemplateResponse.model_validate(template)


@router.put(
    "/{template_id}",
    response_model=TemplateResponse,
    summary="Update Template",
    description="""
    Update an existing contract template (Admin only).

    **Update Features:**
    - Partial updates supported
    - Version control tracking
    - Audit trail maintenance
    - Content and metadata updates

    **Requires Authentication:** Admin user only
    """,
    responses={
        200: {
            "description": "Template updated successfully",
            "model": TemplateResponse,
        },
        401: {"description": "Authentication required", "model": UnauthorizedError},
        403: {"description": "Admin access required", "model": ForbiddenError},
        404: {"description": "Template not found", "model": NotFoundError},
    },
    dependencies=[Depends(security)],
)
async def update_template(
    template_id: str,
    template_data: TemplateUpdate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Update template (admin only)"""

    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise APIExceptionFactory.not_found("Template", template_id)

    # Store old values for audit
    old_values = {
        "name": template.name,
        "category": template.category,
        "contract_type": template.contract_type.value,
        "version": template.version,
    }

    # Update fields
    if template_data.name is not None:
        template.name = template_data.name
    if template_data.category is not None:
        template.category = template_data.category
    if template_data.description is not None:
        template.description = template_data.description
    if template_data.template_content is not None:
        template.template_content = template_data.template_content
    if template_data.compliance_features is not None:
        template.compliance_features = template_data.compliance_features
    if template_data.legal_notes is not None:
        template.legal_notes = template_data.legal_notes
    if template_data.version is not None:
        template.version = template_data.version
    if template_data.is_active is not None:
        template.is_active = template_data.is_active
    if template_data.suitable_for is not None:
        template.suitable_for = template_data.suitable_for

    template.updated_at = get_current_utc()

    db.commit()
    db.refresh(template)

    # Create audit log
    new_values = {
        "name": template.name,
        "category": template.category,
        "contract_type": template.contract_type.value,
        "version": template.version,
    }

    audit_log = AuditLog(
        event_type="template_updated",
        resource_type="template",
        resource_id=template.id,
        user_id=current_user.id,
        old_values=old_values,
        new_values=new_values,
    )
    db.add(audit_log)
    db.commit()

    return TemplateResponse.model_validate(template)


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Template",
    description="""
    Soft delete a contract template (Admin only).

    **Deletion Process:**
    - Template is marked as inactive (soft delete)
    - Existing contracts using this template are unaffected
    - Template can be reactivated if needed
    - Full audit trail maintained

    **Requires Authentication:** Admin user only
    """,
    responses={
        204: {"description": "Template deleted successfully"},
        401: {"description": "Authentication required", "model": UnauthorizedError},
        403: {"description": "Admin access required", "model": ForbiddenError},
        404: {"description": "Template not found", "model": NotFoundError},
    },
    dependencies=[Depends(security)],
)
async def delete_template(
    template_id: str,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Delete template (soft delete by marking inactive)"""

    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise APIExceptionFactory.not_found("Template", template_id)

    # Mark as inactive (soft delete)
    template.is_active = False
    template.updated_at = get_current_utc()

    db.commit()

    # Create audit log
    audit_log = AuditLog(
        event_type="template_deleted",
        resource_type="template",
        resource_id=template.id,
        user_id=current_user.id,
        old_values={"is_active": True},
        new_values={"is_active": False},
    )
    db.add(audit_log)
    db.commit()
