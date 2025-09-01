"""
Advanced Search API Endpoints - Complex search operations
Provides RESTful endpoints for advanced search with filters, sorting, and pagination
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.exceptions import APIExceptionFactory
from app.infrastructure.database.models import User
from app.schemas.search import (
    ContractSearchRequest, UserSearchRequest, TemplateSearchRequest,
    ContractSearchResults, UserSearchResults, TemplateSearchResults,
    SearchOperator, SortDirection
)
from app.schemas.common import ErrorResponse, ValidationError, UnauthorizedError, ForbiddenError
from app.services.search_service import AdvancedSearchService, get_search_service
from fastapi.security import HTTPBearer

# Security scheme for OpenAPI documentation
security = HTTPBearer()

router = APIRouter(prefix="/search", tags=["Advanced Search"])


@router.post(
    "/contracts",
    response_model=ContractSearchResults,
    status_code=status.HTTP_200_OK,
    summary="Advanced Contract Search",
    description="""
    Perform advanced search on contracts with complex filtering, sorting, and pagination.
    
    **Key Features:**
    - Full-text search across contract fields (title, client name, content, etc.)
    - Advanced filters: status, type, date ranges, value ranges, compliance scores
    - Multiple sort criteria with ascending/descending options
    - Pagination with configurable page size
    - Search result highlighting
    - Company isolation - only searches user's company contracts
    
    **Search Operators:**
    - **AND**: All terms must be present (default)
    - **OR**: Any term can match
    - **NOT**: Exclude documents with terms
    
    **Filter Options:**
    - **Status**: DRAFT, ACTIVE, COMPLETED, EXPIRED, TERMINATED
    - **Contract Type**: SERVICE_AGREEMENT, NDA, EMPLOYMENT_CONTRACT, etc.
    - **Date Ranges**: start_date, end_date, created_at, updated_at
    - **Value Ranges**: contract_value with min/max bounds
    - **Compliance**: compliance_score, risk_score ranges
    
    **Sorting Options:**
    - Multiple sort fields with direction (ASC/DESC)
    - Common sorts: relevance, date, value, status
    
    **Performance:**
    - Optimized queries with proper indexing
    - Pagination prevents large result sets
    - Maximum 10,000 searchable results
    
    **Permissions:** Requires valid user authentication
    """,
    responses={
        200: {
            "description": "Search completed successfully",
            "model": ContractSearchResults
        },
        400: {
            "description": "Invalid search parameters",
            "model": ErrorResponse
        },
        401: {
            "description": "Authentication required",
            "model": UnauthorizedError
        },
        403: {
            "description": "Insufficient permissions",
            "model": ForbiddenError
        },
        422: {
            "description": "Validation error",
            "model": ValidationError
        }
    },
    dependencies=[Depends(security)]
)
async def search_contracts(
    request: ContractSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Advanced contract search with filters and sorting"""
    try:
        search_service = get_search_service(db)
        results = await search_service.search_contracts(request, current_user)
        return results
    except Exception as e:
        raise APIExceptionFactory.internal_server_error(f"Contract search failed: {str(e)}")


@router.post(
    "/users",
    response_model=UserSearchResults,
    status_code=status.HTTP_200_OK,
    summary="Advanced User Search",
    description="""
    Perform advanced search on users within the company with filtering and sorting.
    
    **Key Features:**
    - Search by email, name, and department
    - Filter by role, status, and department
    - Date range filtering (creation, last login)
    - Sort by multiple criteria
    - Company isolation - only searches users in same company
    - Privacy-conscious (no sensitive data exposure)
    
    **Search Fields:**
    - **Email**: User email addresses
    - **Full Name**: Complete user names
    - **Department**: User departments
    
    **Filter Options:**
    - **Role**: ADMIN, CONTRACT_MANAGER, LEGAL_REVIEWER, VIEWER
    - **Status**: Active/Inactive users
    - **Department**: Filter by department names
    - **Date Ranges**: created_at, last_login_at
    
    **Security Notes:**
    - Only returns users from same company
    - No password or sensitive data in results
    - Admin permissions may be required for full access
    
    **Use Cases:**
    - Find team members for contract assignments
    - Locate users by role for permission management
    - Identify inactive users for cleanup
    - Department-based user management
    
    **Permissions:** Requires valid user authentication
    """,
    responses={
        200: {
            "description": "User search completed successfully",
            "model": UserSearchResults
        },
        400: {
            "description": "Invalid search parameters",
            "model": ErrorResponse
        },
        401: {
            "description": "Authentication required",
            "model": UnauthorizedError
        },
        403: {
            "description": "Insufficient permissions",
            "model": ForbiddenError
        },
        422: {
            "description": "Validation error",
            "model": ValidationError
        }
    },
    dependencies=[Depends(security)]
)
async def search_users(
    request: UserSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Advanced user search with filters and sorting"""
    try:
        search_service = get_search_service(db)
        results = await search_service.search_users(request, current_user)
        return results
    except Exception as e:
        raise APIExceptionFactory.internal_server_error(f"User search failed: {str(e)}")


@router.post(
    "/templates",
    response_model=TemplateSearchResults,
    status_code=status.HTTP_200_OK,
    summary="Advanced Template Search",
    description="""
    Perform advanced search on contract templates with filtering and sorting.
    
    **Key Features:**
    - Search across template names, descriptions, and categories
    - Filter by contract type, category, and suitability
    - Find templates by industry or use case
    - Sort by relevance, name, or creation date
    - Access to all active public templates
    
    **Search Fields:**
    - **Name**: Template names and titles
    - **Description**: Template descriptions and summaries
    - **Category**: Template categories (legal, service, employment, etc.)
    - **Legal Notes**: Additional legal guidance text
    
    **Filter Options:**
    - **Contract Type**: SERVICE_AGREEMENT, NDA, EMPLOYMENT_CONTRACT, etc.
    - **Category**: Filter by template categories
    - **Status**: Active/Inactive templates
    - **Suitable For**: Industries or business types
    - **Version**: Specific template versions
    
    **Template Categories:**
    - **Legal**: NDAs, privacy policies, terms of service
    - **Service**: Service agreements, consulting contracts
    - **Employment**: Employment contracts, contractor agreements
    - **Commercial**: Purchase orders, supplier agreements
    - **Partnership**: Joint ventures, collaboration agreements
    
    **Use Cases:**
    - Find templates for specific contract types
    - Discover templates by industry suitability
    - Locate updated template versions
    - Browse available legal frameworks
    
    **Permissions:** Requires valid user authentication
    """,
    responses={
        200: {
            "description": "Template search completed successfully",
            "model": TemplateSearchResults
        },
        400: {
            "description": "Invalid search parameters",
            "model": ErrorResponse
        },
        401: {
            "description": "Authentication required",
            "model": UnauthorizedError
        },
        422: {
            "description": "Validation error",
            "model": ValidationError
        }
    },
    dependencies=[Depends(security)]
)
async def search_templates(
    request: TemplateSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Advanced template search with filters and sorting"""
    try:
        search_service = get_search_service(db)
        results = await search_service.search_templates(request, current_user)
        return results
    except Exception as e:
        raise APIExceptionFactory.internal_server_error(f"Template search failed: {str(e)}")


@router.get(
    "/contracts/quick",
    response_model=ContractSearchResults,
    summary="Quick Contract Search",
    description="""
    Simplified contract search for common use cases.
    
    **Quick Search Parameters:**
    - **q**: Search query text
    - **status**: Filter by contract status
    - **type**: Filter by contract type
    - **client**: Filter by client name
    - **page**: Page number (default: 1)
    - **size**: Results per page (default: 20)
    
    This endpoint provides a simplified interface for common contract searches
    without needing to construct complex search requests.
    
    **Examples:**
    - `GET /search/contracts/quick?q=service agreement&status=ACTIVE`
    - `GET /search/contracts/quick?client=ABC Corp&type=SERVICE_AGREEMENT`
    - `GET /search/contracts/quick?q=NDA&page=2&size=10`
    
    **Permissions:** Requires valid user authentication
    """,
    responses={
        200: {
            "description": "Quick search completed successfully",
            "model": ContractSearchResults
        },
        401: {
            "description": "Authentication required",
            "model": UnauthorizedError
        }
    },
    dependencies=[Depends(security)]
)
async def quick_search_contracts(
    q: Optional[str] = Query(None, description="Search query"),
    status: Optional[str] = Query(None, description="Contract status"),
    type: Optional[str] = Query(None, description="Contract type", alias="contract_type"),
    client: Optional[str] = Query(None, description="Client name"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Results per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Quick contract search with simple parameters"""
    try:
        # Build search request from query parameters
        from app.schemas.search import ContractSearchRequest, ContractSearchFilters
        
        filters = ContractSearchFilters()
        
        if status:
            filters.status = [status.upper()]
        
        if type:
            filters.contract_type = [type.upper()]
        
        if client:
            filters.client_name = client
        
        request = ContractSearchRequest(
            query=q or "",
            filters=filters,
            page=page,
            size=size
        )
        
        search_service = get_search_service(db)
        results = await search_service.search_contracts(request, current_user)
        return results
        
    except Exception as e:
        raise APIExceptionFactory.internal_server_error(f"Quick search failed: {str(e)}")


@router.get(
    "/suggestions/contracts",
    summary="Contract Search Suggestions",
    description="""
    Get search suggestions for contract searches.
    
    Provides autocomplete suggestions based on:
    - Recent contract titles
    - Popular client names  
    - Common contract types
    - Frequently used terms
    
    **Parameters:**
    - **q**: Partial query for suggestions
    - **limit**: Maximum suggestions to return (default: 10)
    - **type**: Suggestion type (titles, clients, terms)
    
    **Use Cases:**
    - Autocomplete in search interfaces
    - Discover common search terms
    - Improve search experience
    
    **Permissions:** Requires valid user authentication
    """,
    responses={
        200: {
            "description": "Suggestions retrieved successfully"
        },
        401: {
            "description": "Authentication required",
            "model": UnauthorizedError
        }
    },
    dependencies=[Depends(security)]
)
async def get_contract_search_suggestions(
    q: str = Query(..., description="Partial query for suggestions"),
    limit: int = Query(10, ge=1, le=50, description="Maximum suggestions"),
    type: Optional[str] = Query(None, description="Suggestion type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get contract search suggestions"""
    try:
        # This would implement actual suggestion logic
        # For now, return a simple response
        suggestions = []
        
        if len(q) >= 2:
            # Mock suggestions - would implement actual suggestion logic
            mock_suggestions = [
                f"{q} agreement",
                f"{q} contract",
                f"{q} service",
                f"{q} template"
            ]
            suggestions = mock_suggestions[:limit]
        
        return {
            "suggestions": suggestions,
            "query": q,
            "total": len(suggestions)
        }
        
    except Exception as e:
        raise APIExceptionFactory.internal_server_error(f"Suggestions failed: {str(e)}")


@router.get(
    "/facets/contracts",
    summary="Contract Search Facets",
    description="""
    Get faceted search information for contracts.
    
    Returns aggregated information about contracts to help with filtering:
    - Available contract statuses with counts
    - Contract types with counts  
    - Popular clients
    - Date ranges
    - Value ranges
    
    **Use Cases:**
    - Build dynamic search filters
    - Show available filter options
    - Display search result statistics
    
    **Permissions:** Requires valid user authentication
    """,
    responses={
        200: {
            "description": "Facets retrieved successfully"
        },
        401: {
            "description": "Authentication required",
            "model": UnauthorizedError
        }
    },
    dependencies=[Depends(security)]
)
async def get_contract_search_facets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get contract search facets for filtering"""
    try:
        # This would implement actual faceting logic
        # For now, return mock facet data
        
        facets = {
            "status": [
                {"value": "DRAFT", "count": 25},
                {"value": "ACTIVE", "count": 150},
                {"value": "COMPLETED", "count": 75},
                {"value": "TERMINATED", "count": 10}
            ],
            "contract_type": [
                {"value": "SERVICE_AGREEMENT", "count": 100},
                {"value": "NDA", "count": 80},
                {"value": "EMPLOYMENT_CONTRACT", "count": 40},
                {"value": "SUPPLIER_AGREEMENT", "count": 30}
            ],
            "value_ranges": [
                {"min": 0, "max": 1000, "count": 50},
                {"min": 1000, "max": 10000, "count": 120},
                {"min": 10000, "max": 100000, "count": 80},
                {"min": 100000, "max": None, "count": 10}
            ]
        }
        
        return {
            "facets": facets,
            "generated_at": "2024-01-01T00:00:00Z"
        }
        
    except Exception as e:
        raise APIExceptionFactory.internal_server_error(f"Facets failed: {str(e)}")