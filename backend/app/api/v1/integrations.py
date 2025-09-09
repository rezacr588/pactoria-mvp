"""
Integration API endpoints for Pactoria MVP
Handles third-party integrations and external service connections
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.infrastructure.database.models import User
from app.domain.services.integration_service import IntegrationDomainService
from app.domain.repositories.integration import IntegrationRepository
from app.infrastructure.repositories.in_memory_integration_repository import InMemoryIntegrationRepository
from app.domain.entities.integration import IntegrationConfiguration
from app.domain.exceptions import NotFoundError, ValidationError


# Router
router = APIRouter(
    prefix="/integrations",
    tags=["Integrations"],
    dependencies=[Depends(get_current_user)]
)

# Dependency injection


async def get_integration_repository() -> IntegrationRepository:
    """Get integration repository instance"""
    return InMemoryIntegrationRepository()


async def get_integration_service(
    repository: IntegrationRepository = Depends(get_integration_repository)
) -> IntegrationDomainService:
    """Get integration domain service instance"""
    return IntegrationDomainService(repository)


# Request/Response Models
class IntegrationResponse(BaseModel):
    """Integration response model"""
    id: str
    name: str
    description: str
    category: str
    provider: str
    status: str
    is_popular: bool
    is_premium: bool
    setup_time_minutes: int
    connections_count: int
    rating: float
    price_tier: str
    features: List[str]


class IntegrationConnectionRequest(BaseModel):
    """Request model for connecting an integration"""
    configuration: Dict[str, Any] = Field(default_factory=dict)
    api_key: Optional[str] = None
    webhook_url: Optional[str] = None


class IntegrationConfigurationRequest(BaseModel):
    """Request model for configuring an integration"""
    configuration: Dict[str, Any]
    webhook_url: Optional[str] = None


class StandardResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool = True
    data: Optional[Any] = None
    message: Optional[str] = None


# Endpoints
@router.get("/", response_model=List[IntegrationResponse])
async def get_integrations(
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status"),
    price_tier: Optional[str] = Query(None, description="Filter by price tier"),
    popular_only: Optional[bool] = Query(None, description="Show only popular integrations"),
    search: Optional[str] = Query(None, description="Search integrations"),
    current_user: User = Depends(get_current_user),
    integration_service: IntegrationDomainService = Depends(get_integration_service)
):
    """Get all available integrations with optional filters"""
    try:
        # Convert string parameters to enums if provided
        from app.domain.entities.integration import IntegrationCategory, IntegrationStatus

        category_filter = None
        if category:
            try:
                category_filter = IntegrationCategory(category)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid category: {category}"
                )

        status_filter = None
        if status:
            try:
                status_filter = IntegrationStatus(status)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid status: {status}"
                )

        # Get filtered integrations
        repository = await get_integration_repository()
        integrations = await repository.get_filtered(
            category=category_filter,
            status=status_filter,
            price_tier=price_tier,
            popular_only=popular_only,
            search=search,
            company_id=current_user.company_id
        )

        # Convert to response format
        return [
            IntegrationResponse(
                id=integration.id,
                name=integration.name,
                description=integration.description,
                category=integration.category.value,
                provider=integration.provider.value,
                status=integration.status.value,
                is_popular=integration.is_popular,
                is_premium=integration.is_premium,
                setup_time_minutes=integration.setup_time_minutes,
                connections_count=integration.connections_count,
                rating=integration.rating,
                price_tier=integration.price_tier.value,
                features=integration.features.features
            )
            for integration in integrations
        ]

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve integrations: {str(e)}"
        )


@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: str,
    current_user: User = Depends(get_current_user),
    integration_service: IntegrationDomainService = Depends(get_integration_service)
):
    """Get specific integration by ID"""
    try:
        repository = await get_integration_repository()
        integration = await repository.get_by_id(integration_id)

        if not integration:
            raise HTTPException(
                status_code=404,
                detail=f"Integration with id '{integration_id}' not found"
            )

        return IntegrationResponse(
            id=integration.id,
            name=integration.name,
            description=integration.description,
            category=integration.category.value,
            provider=integration.provider.value,
            status=integration.status.value,
            is_popular=integration.is_popular,
            is_premium=integration.is_premium,
            setup_time_minutes=integration.setup_time_minutes,
            connections_count=integration.connections_count,
            rating=integration.rating,
            price_tier=integration.price_tier.value,
            features=integration.features.features
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve integration: {str(e)}"
        )


@router.post("/{integration_id}/connect", response_model=StandardResponse)
async def connect_integration(
    integration_id: str,
    request: IntegrationConnectionRequest,
    current_user: User = Depends(get_current_user),
    integration_service: IntegrationDomainService = Depends(get_integration_service)
):
    """Connect an integration"""
    try:
        # Create configuration object
        configuration = None
        if request.configuration or request.api_key or request.webhook_url:
            configuration = IntegrationConfiguration(
                settings=request.configuration,
                api_key=request.api_key,
                webhook_url=request.webhook_url
            )

        # Connect integration
        result = await integration_service.connect_integration(
            integration_id=integration_id,
            user_id=current_user.id,
            company_id=current_user.company_id,
            configuration=configuration
        )

        return StandardResponse(
            success=True,
            data=result
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect integration: {str(e)}"
        )


@router.delete("/{integration_id}/disconnect", response_model=StandardResponse)
async def disconnect_integration(
    integration_id: str,
    current_user: User = Depends(get_current_user),
    integration_service: IntegrationDomainService = Depends(get_integration_service)
):
    """Disconnect an integration"""
    try:
        result = await integration_service.disconnect_integration(
            integration_id=integration_id,
            user_id=current_user.id,
            company_id=current_user.company_id
        )

        return StandardResponse(
            success=True,
            data=result
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to disconnect integration: {str(e)}"
        )


@router.put("/{integration_id}/configure", response_model=StandardResponse)
async def configure_integration(
    integration_id: str,
    request: IntegrationConfigurationRequest,
    current_user: User = Depends(get_current_user),
    integration_service: IntegrationDomainService = Depends(get_integration_service)
):
    """Configure an integration"""
    try:
        # Create configuration object
        configuration = IntegrationConfiguration(
            settings=request.configuration,
            webhook_url=request.webhook_url
        )

        result = await integration_service.configure_integration(
            integration_id=integration_id,
            user_id=current_user.id,
            company_id=current_user.company_id,
            configuration=configuration
        )

        return StandardResponse(
            success=True,
            data=result
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=422,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to configure integration: {str(e)}"
        )


@router.get("/{integration_id}/sync-status", response_model=StandardResponse)
async def get_sync_status(
    integration_id: str,
    current_user: User = Depends(get_current_user),
    integration_service: IntegrationDomainService = Depends(get_integration_service)
):
    """Get sync status for an integration"""
    try:
        result = await integration_service.get_integration_sync_status(
            integration_id=integration_id,
            company_id=current_user.company_id
        )

        return StandardResponse(
            success=True,
            data=result
        )

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get sync status: {str(e)}"
        )


@router.post("/{integration_id}/sync", response_model=StandardResponse)
async def trigger_sync(
    integration_id: str,
    current_user: User = Depends(get_current_user),
    integration_service: IntegrationDomainService = Depends(get_integration_service)
):
    """Trigger synchronization for an integration"""
    try:
        result = await integration_service.trigger_integration_sync(
            integration_id=integration_id,
            user_id=current_user.id,
            company_id=current_user.company_id
        )

        return StandardResponse(
            success=True,
            data=result
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to trigger sync: {str(e)}"
        )


@router.get("/stats/summary")
async def get_integration_stats(
    current_user: User = Depends(get_current_user),
    integration_service: IntegrationDomainService = Depends(get_integration_service)
):
    """Get integration statistics"""
    try:
        stats = await integration_service.get_integration_statistics()
        return stats

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get integration stats: {str(e)}"
        )


@router.get("/categories/list", response_model=StandardResponse)
async def get_integration_categories(
    current_user: User = Depends(get_current_user),
    integration_service: IntegrationDomainService = Depends(get_integration_service)
):
    """Get available integration categories"""
    try:
        categories = await integration_service.get_integration_categories()
        return StandardResponse(
            success=True,
            data=categories
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get integration categories: {str(e)}"
        )
