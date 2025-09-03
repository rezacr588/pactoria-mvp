"""
Integrations API endpoints
Provides integration management for third-party services
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.infrastructure.database.models import User

router = APIRouter(prefix="/integrations", tags=["Integrations"])


# Request/Response Models
class IntegrationBase(BaseModel):
    """Base integration model"""
    name: str
    description: str
    category: str = Field(description="Category: crm, accounting, storage, communication, etc.")
    provider: str
    logo_url: Optional[str] = None
    features: List[str] = Field(default_factory=list)


class Integration(IntegrationBase):
    """Integration response model"""
    id: str
    status: str = Field(description="Status: connected, available, pending, error")
    is_popular: bool = Field(default=False)
    is_premium: bool = Field(default=False)
    setup_time_minutes: int = Field(default=10)
    last_sync: Optional[datetime] = None
    sync_status: Optional[str] = Field(None, description="success, warning, error")
    connections_count: int = Field(default=0)
    rating: float = Field(default=0.0, ge=0.0, le=5.0)
    price_tier: str = Field(default="free", description="free, premium, enterprise")
    documentation_url: Optional[str] = None
    webhook_url: Optional[str] = None
    api_key_required: bool = Field(default=True)


class IntegrationConnection(BaseModel):
    """Integration connection model"""
    id: str
    integration_id: str
    user_id: str
    company_id: str
    status: str = Field(description="active, pending, error, disconnected")
    connected_at: datetime
    last_sync: Optional[datetime] = None
    sync_status: Optional[str] = None
    configuration: dict = Field(default_factory=dict)
    error_message: Optional[str] = None


class IntegrationConnect(BaseModel):
    """Integration connection request"""
    configuration: dict = Field(default_factory=dict, description="Integration-specific configuration")
    api_key: Optional[str] = None
    webhook_url: Optional[str] = None


class IntegrationConfigure(BaseModel):
    """Integration configuration update"""
    configuration: dict
    webhook_url: Optional[str] = None


class IntegrationStats(BaseModel):
    """Integration statistics"""
    total_available: int
    connected_count: int
    available_count: int
    error_count: int
    pending_count: int
    by_category: dict
    by_status: dict
    most_popular: List[dict]


# Mock data for demonstration
def get_mock_integrations() -> List[Integration]:
    """Get mock integrations"""
    return [
        Integration(
            id="1",
            name="Xero",
            description="Sync contract data with your Xero accounting system for seamless financial management",
            category="accounting",
            provider="Xero Limited",
            logo_url="https://cdn.xero.com/brand/logo.png",
            status="available",
            is_popular=True,
            is_premium=False,
            features=["Invoice Generation", "Payment Tracking", "Financial Reporting", "Tax Calculations"],
            setup_time_minutes=10,
            connections_count=1247,
            rating=4.8,
            price_tier="free",
            documentation_url="https://developer.xero.com/documentation/",
            api_key_required=True
        ),
        Integration(
            id="2",
            name="HubSpot CRM",
            description="Connect contracts to your CRM deals and automatically update customer records",
            category="crm",
            provider="HubSpot Inc.",
            logo_url="https://www.hubspot.com/hubfs/assets/hubspot.com/brand-templates/brand-logos/hubspot-logo.png",
            status="connected",
            is_popular=True,
            is_premium=False,
            features=["Deal Tracking", "Contact Sync", "Pipeline Management", "Revenue Analytics"],
            setup_time_minutes=15,
            last_sync=datetime.now() - timedelta(hours=2),
            sync_status="warning",
            connections_count=2156,
            rating=4.7,
            price_tier="free",
            documentation_url="https://developers.hubspot.com/docs/",
            api_key_required=True
        ),
        Integration(
            id="3",
            name="DocuSign",
            description="Enable electronic signatures directly from Pactoria for faster contract execution",
            category="legal",
            provider="DocuSign Inc.",
            logo_url="https://docusign.com/sites/default/files/docusign-logo.png",
            status="available",
            is_popular=True,
            is_premium=True,
            features=["E-Signatures", "Identity Verification", "Audit Trail", "Mobile Signing"],
            setup_time_minutes=20,
            connections_count=5423,
            rating=4.9,
            price_tier="premium",
            documentation_url="https://developers.docusign.com/",
            api_key_required=True
        ),
        Integration(
            id="4",
            name="Google Drive",
            description="Store and organize your contracts in Google Drive with automatic backups",
            category="storage",
            provider="Google LLC",
            logo_url="https://developers.google.com/drive/images/drive_icon.png",
            status="connected",
            is_popular=True,
            is_premium=False,
            features=["File Storage", "Version Control", "Team Sharing", "Search Integration"],
            setup_time_minutes=5,
            last_sync=datetime.now() - timedelta(minutes=30),
            sync_status="success",
            connections_count=8932,
            rating=4.6,
            price_tier="free",
            documentation_url="https://developers.google.com/drive/api/",
            api_key_required=False
        ),
        Integration(
            id="5",
            name="Slack",
            description="Get contract notifications and updates directly in your Slack channels",
            category="communication",
            provider="Slack Technologies",
            logo_url="https://slack.com/img/slack_hash_256.png",
            status="available",
            is_popular=True,
            is_premium=False,
            features=["Instant Notifications", "Team Collaboration", "Status Updates", "File Sharing"],
            setup_time_minutes=8,
            connections_count=3421,
            rating=4.5,
            price_tier="free",
            documentation_url="https://api.slack.com/",
            webhook_url="https://hooks.slack.com/services/webhook",
            api_key_required=True
        ),
        Integration(
            id="6",
            name="Salesforce",
            description="Integrate contract lifecycle with your Salesforce opportunities and accounts",
            category="crm",
            provider="Salesforce Inc.",
            logo_url="https://www.salesforce.com/content/dam/web/en_us/www/images/nav/salesforce-logo.svg",
            status="available",
            is_popular=True,
            is_premium=True,
            features=["Opportunity Sync", "Account Management", "Revenue Forecasting", "Custom Fields"],
            setup_time_minutes=25,
            connections_count=4567,
            rating=4.8,
            price_tier="enterprise",
            documentation_url="https://developer.salesforce.com/docs/",
            api_key_required=True
        ),
        Integration(
            id="7",
            name="BambooHR",
            description="Sync employment contracts with your HR system for streamlined onboarding",
            category="hr",
            provider="BambooHR LLC",
            logo_url="https://www.bamboohr.com/logo.png",
            status="error",
            is_popular=False,
            is_premium=False,
            features=["Employee Onboarding", "Document Management", "Compliance Tracking", "Reporting"],
            setup_time_minutes=18,
            last_sync=datetime.now() - timedelta(days=1),
            sync_status="error",
            connections_count=892,
            rating=4.4,
            price_tier="premium",
            documentation_url="https://documentation.bamboohr.com/",
            api_key_required=True
        )
    ]


def get_mock_user_connections(user_id: str, company_id: str) -> List[IntegrationConnection]:
    """Get mock user connections"""
    return [
        IntegrationConnection(
            id="conn_1",
            integration_id="2",  # HubSpot
            user_id=user_id,
            company_id=company_id,
            status="active",
            connected_at=datetime.now() - timedelta(days=30),
            last_sync=datetime.now() - timedelta(hours=2),
            sync_status="warning",
            configuration={"api_key": "***hidden***", "portal_id": "123456"}
        ),
        IntegrationConnection(
            id="conn_2", 
            integration_id="4",  # Google Drive
            user_id=user_id,
            company_id=company_id,
            status="active",
            connected_at=datetime.now() - timedelta(days=15),
            last_sync=datetime.now() - timedelta(minutes=30),
            sync_status="success",
            configuration={"folder_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"}
        ),
        IntegrationConnection(
            id="conn_3",
            integration_id="7",  # BambooHR
            user_id=user_id,
            company_id=company_id,
            status="error",
            connected_at=datetime.now() - timedelta(days=5),
            last_sync=datetime.now() - timedelta(days=1),
            sync_status="error",
            configuration={"api_key": "***hidden***", "company_domain": "techcorp"},
            error_message="Authentication failed. Please check API key."
        )
    ]


@router.get("/", response_model=List[Integration])
async def get_integrations(
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by connection status"), 
    price_tier: Optional[str] = Query(None, description="Filter by price tier"),
    popular_only: bool = Query(False, description="Show only popular integrations"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    current_user: User = Depends(get_current_user)
):
    """
    Get available integrations with optional filtering
    
    Returns all available integrations with their connection status
    for the current user's company.
    """
    try:
        # TODO: Implement actual database query
        integrations = get_mock_integrations()
        user_connections = get_mock_user_connections(current_user.id, current_user.company_id)
        
        # Update integration status based on user connections
        connected_integration_ids = {conn.integration_id for conn in user_connections if conn.status == "active"}
        error_integration_ids = {conn.integration_id for conn in user_connections if conn.status == "error"}
        
        for integration in integrations:
            if integration.id in connected_integration_ids:
                integration.status = "connected"
                # Find the connection to get sync info
                for conn in user_connections:
                    if conn.integration_id == integration.id and conn.status == "active":
                        integration.last_sync = conn.last_sync
                        integration.sync_status = conn.sync_status
                        break
            elif integration.id in error_integration_ids:
                integration.status = "error"
        
        # Apply filters
        if category:
            integrations = [i for i in integrations if i.category == category]
        
        if status:
            integrations = [i for i in integrations if i.status == status]
        
        if price_tier:
            integrations = [i for i in integrations if i.price_tier == price_tier]
        
        if popular_only:
            integrations = [i for i in integrations if i.is_popular]
        
        if search:
            integrations = [
                i for i in integrations
                if search.lower() in i.name.lower() 
                or search.lower() in i.description.lower()
                or search.lower() in i.provider.lower()
            ]
        
        # Sort: connected first, then by popularity, then by rating
        integrations.sort(key=lambda x: (
            x.status != "connected",
            not x.is_popular,
            -x.rating
        ))
        
        return integrations
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve integrations: {str(e)}")


@router.get("/{integration_id}", response_model=Integration)
async def get_integration(
    integration_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific integration by ID"""
    try:
        # TODO: Implement actual database query
        integrations = get_mock_integrations()
        user_connections = get_mock_user_connections(current_user.id, current_user.company_id)
        
        for integration in integrations:
            if integration.id == integration_id:
                # Update status based on user connection
                for conn in user_connections:
                    if conn.integration_id == integration_id:
                        if conn.status == "active":
                            integration.status = "connected"
                            integration.last_sync = conn.last_sync
                            integration.sync_status = conn.sync_status
                        elif conn.status == "error":
                            integration.status = "error"
                        break
                
                return integration
        
        raise HTTPException(status_code=404, detail="Integration not found")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve integration: {str(e)}")


@router.post("/{integration_id}/connect")
async def connect_integration(
    integration_id: str,
    connection_data: IntegrationConnect,
    current_user: User = Depends(get_current_user)
):
    """
    Connect to an integration
    
    Establishes a connection to the specified integration using
    the provided configuration and credentials.
    """
    try:
        # TODO: Validate integration exists
        # TODO: Check if already connected
        # TODO: Validate configuration based on integration requirements
        # TODO: Test connection with provided credentials
        # TODO: Store connection configuration (encrypt sensitive data)
        # TODO: Set up webhooks if supported
        
        new_connection = IntegrationConnection(
            id=f"conn_{int(datetime.now().timestamp())}",
            integration_id=integration_id,
            user_id=current_user.id,
            company_id=current_user.company_id,
            status="active",
            connected_at=datetime.now(),
            last_sync=datetime.now(),
            sync_status="success",
            configuration=connection_data.configuration
        )
        
        return {
            "success": True,
            "data": {
                "message": "Integration connected successfully",
                "connection_id": new_connection.id,
                "integration_id": integration_id,
                "status": "connected",
                "connected_at": new_connection.connected_at
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect integration: {str(e)}")


@router.delete("/{integration_id}/disconnect")
async def disconnect_integration(
    integration_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Disconnect from an integration
    
    Removes the connection and cleans up any associated webhooks
    or scheduled sync jobs.
    """
    try:
        # TODO: Find existing connection
        # TODO: Clean up webhooks
        # TODO: Cancel any scheduled sync jobs
        # TODO: Mark connection as disconnected
        # TODO: Log audit trail
        
        return {
            "success": True,
            "data": {
                "message": "Integration disconnected successfully",
                "integration_id": integration_id,
                "disconnected_at": datetime.now()
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to disconnect integration: {str(e)}")


@router.put("/{integration_id}/configure")
async def configure_integration(
    integration_id: str,
    config_data: IntegrationConfigure,
    current_user: User = Depends(get_current_user)
):
    """
    Update integration configuration
    
    Updates the configuration for an existing integration connection.
    """
    try:
        # TODO: Find existing connection
        # TODO: Validate new configuration
        # TODO: Test connection with new configuration
        # TODO: Update stored configuration
        # TODO: Update webhooks if changed
        
        return {
            "success": True,
            "data": {
                "message": "Integration configuration updated successfully",
                "integration_id": integration_id,
                "updated_at": datetime.now()
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to configure integration: {str(e)}")


@router.get("/{integration_id}/sync-status")
async def get_sync_status(
    integration_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get sync status for a connected integration"""
    try:
        # TODO: Find connection
        # TODO: Get latest sync information
        # TODO: Check for any pending sync jobs
        
        user_connections = get_mock_user_connections(current_user.id, current_user.company_id)
        
        for conn in user_connections:
            if conn.integration_id == integration_id:
                return {
                    "success": True,
                    "data": {
                        "integration_id": integration_id,
                        "status": conn.sync_status,
                        "last_sync": conn.last_sync,
                        "next_sync": datetime.now() + timedelta(hours=1),  # Mock
                        "error_message": conn.error_message,
                        "sync_frequency": "hourly",
                        "records_synced": 150  # Mock
                    }
                }
        
        raise HTTPException(status_code=404, detail="Integration connection not found")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sync status: {str(e)}")


@router.post("/{integration_id}/sync")
async def trigger_sync(
    integration_id: str,
    current_user: User = Depends(get_current_user)
):
    """Manually trigger a sync for the integration"""
    try:
        # TODO: Find connection
        # TODO: Check if sync is already in progress
        # TODO: Queue sync job
        # TODO: Return job status
        
        return {
            "success": True,
            "data": {
                "message": "Sync triggered successfully",
                "integration_id": integration_id,
                "sync_job_id": f"sync_{int(datetime.now().timestamp())}",
                "estimated_completion": datetime.now() + timedelta(minutes=5)
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger sync: {str(e)}")


@router.get("/stats/summary", response_model=IntegrationStats)
async def get_integration_stats(
    current_user: User = Depends(get_current_user)
):
    """Get integration statistics for the current user's company"""
    try:
        # TODO: Implement actual database queries
        integrations = get_mock_integrations()
        user_connections = get_mock_user_connections(current_user.id, current_user.company_id)
        
        connected_ids = {conn.integration_id for conn in user_connections if conn.status == "active"}
        error_ids = {conn.integration_id for conn in user_connections if conn.status == "error"}
        
        connected_count = len(connected_ids)
        error_count = len(error_ids)
        available_count = len(integrations) - connected_count - error_count
        
        # Group by category
        by_category = {}
        for integration in integrations:
            by_category[integration.category] = by_category.get(integration.category, 0) + 1
        
        # Group by status
        by_status = {
            "connected": connected_count,
            "available": available_count,
            "error": error_count,
            "pending": 0  # Mock
        }
        
        # Most popular integrations
        most_popular = sorted(
            [{"name": i.name, "connections": i.connections_count, "rating": i.rating} 
             for i in integrations if i.is_popular],
            key=lambda x: x["connections"],
            reverse=True
        )[:5]
        
        return IntegrationStats(
            total_available=len(integrations),
            connected_count=connected_count,
            available_count=available_count,
            error_count=error_count,
            pending_count=0,
            by_category=by_category,
            by_status=by_status,
            most_popular=most_popular
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve integration statistics: {str(e)}")


@router.get("/categories/list")
async def get_integration_categories(
    current_user: User = Depends(get_current_user)
):
    """Get list of available integration categories"""
    return {
        "success": True,
        "data": {
            "categories": [
                {"value": "crm", "name": "CRM & Sales", "description": "Customer relationship management"},
                {"value": "accounting", "name": "Accounting & Finance", "description": "Financial management tools"},
                {"value": "storage", "name": "Storage & Backup", "description": "File storage and backup services"},
                {"value": "communication", "name": "Communication", "description": "Team communication tools"},
                {"value": "hr", "name": "Human Resources", "description": "HR management systems"},
                {"value": "productivity", "name": "Productivity", "description": "Productivity and project management"},
                {"value": "legal", "name": "Legal & Compliance", "description": "Legal and compliance tools"},
                {"value": "analytics", "name": "Analytics", "description": "Analytics and reporting tools"}
            ]
        }
    }