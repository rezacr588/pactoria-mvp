"""
Integration domain service for business logic
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from app.domain.entities.integration import (
    Integration,
    IntegrationCategory,
    IntegrationStatus,
    IntegrationConfiguration,
    IntegrationFeatures,
    SyncStatus
)
from app.domain.repositories.integration import IntegrationRepository


class IntegrationDomainService:
    """Domain service for Integration business logic"""

    def __init__(self, integration_repository: IntegrationRepository):
        self._integration_repository = integration_repository

    async def get_integration_statistics(self) -> Dict[str, Any]:
        """Calculate integration statistics"""
        integrations = await self._integration_repository.get_all()

        # Count by status
        status_counts = {}
        for status in IntegrationStatus:
            status_counts[status.value] = len([
                i for i in integrations if i.status == status
            ])

        # Count by category
        category_counts = {}
        for category in IntegrationCategory:
            category_counts[category.value] = len([
                i for i in integrations if i.category == category
            ])

        # Get most popular
        popular_integrations = sorted(
            [i for i in integrations if i.is_popular],
            key=lambda x: (x.connections_count, x.rating),
            reverse=True
        )[:5]

        most_popular = [
            {
                "name": integration.name,
                "connections": integration.connections_count,
                "rating": integration.rating,
                "category": integration.category.value
            }
            for integration in popular_integrations
        ]

        return {
            "total_available": len(integrations),
            "connected_count": status_counts.get("connected", 0),
            "available_count": status_counts.get("available", 0),
            "error_count": status_counts.get("error", 0),
            "pending_count": status_counts.get("pending", 0),
            "by_category": category_counts,
            "by_status": status_counts,
            "most_popular": most_popular
        }

    async def get_integration_categories(self) -> Dict[str, Any]:
        """Get available integration categories with descriptions"""
        categories = [
            {
                "value": "email",
                "name": "Email Notifications",
                "description": "Email alerts and notifications"
            },
            {
                "value": "calendar",
                "name": "Calendar Integration",
                "description": "Calendar synchronization and events"
            },
            {
                "value": "export",
                "name": "Data Export",
                "description": "Export data to various formats"
            },
            {
                "value": "crm",
                "name": "Customer Relationship Management",
                "description": "CRM system integrations"
            },
            {
                "value": "accounting",
                "name": "Accounting & Finance",
                "description": "Financial and accounting system integrations"
            },
            {
                "value": "storage",
                "name": "Cloud Storage",
                "description": "File storage and document management"
            },
            {
                "value": "communication",
                "name": "Communication",
                "description": "Messaging and communication platforms"
            },
            {
                "value": "hr",
                "name": "Human Resources",
                "description": "HR and employee management systems"
            },
            {
                "value": "productivity",
                "name": "Productivity Tools",
                "description": "Productivity and workflow applications"
            },
            {
                "value": "legal",
                "name": "Legal Services",
                "description": "Legal document and compliance services"
            },
            {
                "value": "analytics",
                "name": "Analytics & Reporting",
                "description": "Analytics and business intelligence tools"
            }
        ]

        return {"categories": categories}

    async def validate_integration_connection(
        self,
        integration_id: str,
        user_id: str,
        company_id: str,
        configuration: Optional[IntegrationConfiguration] = None
    ) -> bool:
        """Validate if integration can be connected"""
        integration = await self._integration_repository.get_by_id(integration_id)
        if not integration:
            return False

        return integration.can_be_connected_by_user(user_id, company_id)

    async def connect_integration(
        self,
        integration_id: str,
        user_id: str,
        company_id: str,
        configuration: Optional[IntegrationConfiguration] = None
    ) -> Dict[str, Any]:
        """Connect an integration for a user/company"""
        integration = await self._integration_repository.get_by_id(integration_id)
        if not integration:
            raise ValueError(f"Integration {integration_id} not found")

        # Validate connection
        if not await self.validate_integration_connection(
            integration_id, user_id, company_id, configuration
        ):
            raise ValueError(f"Cannot connect integration {integration_id}")

        # Connect the integration
        integration.connect(user_id, company_id, configuration)

        # Save changes
        await self._integration_repository.save(integration)

        return {
            "integration_id": integration.id,
            "status": integration.status.value,
            "connection_id": f"conn_{integration.id}_{company_id}",
            "connected_at": integration.connected_at.isoformat() if integration.connected_at else None
        }

    async def disconnect_integration(
        self,
        integration_id: str,
        user_id: str,
        company_id: str
    ) -> Dict[str, Any]:
        """Disconnect an integration"""
        integration = await self._integration_repository.get_by_id(integration_id)
        if not integration:
            raise ValueError(f"Integration {integration_id} not found")

        # If integration is not connected, return success (idempotent operation)
        if not integration.is_connected:
            return {
                "integration_id": integration.id,
                "disconnected_at": datetime.now(timezone.utc).isoformat(),
                "message": "Integration was already disconnected"
            }

        # Validate user can disconnect (owns the connection)
        if integration.company_id != company_id:
            raise ValueError("Cannot disconnect integration not owned by company")

        # Disconnect the integration
        integration.disconnect(user_id)

        # Save changes
        await self._integration_repository.save(integration)

        return {
            "integration_id": integration.id,
            "disconnected_at": datetime.now(timezone.utc).isoformat()
        }

    async def configure_integration(
        self,
        integration_id: str,
        user_id: str,
        company_id: str,
        configuration: IntegrationConfiguration
    ) -> Dict[str, Any]:
        """Configure an integration"""
        integration = await self._integration_repository.get_by_id(integration_id)
        if not integration:
            raise ValueError(f"Integration {integration_id} not found")

        # Validate user can configure (owns the connection)
        if integration.company_id != company_id:
            raise ValueError("Cannot configure integration not owned by company")

        # Update configuration
        integration.update_configuration(user_id, configuration)

        # Save changes
        await self._integration_repository.save(integration)

        return {
            "integration_id": integration.id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

    async def trigger_integration_sync(
        self,
        integration_id: str,
        user_id: str,
        company_id: str
    ) -> Dict[str, Any]:
        """Trigger synchronization for an integration"""
        integration = await self._integration_repository.get_by_id(integration_id)
        if not integration:
            raise ValueError(f"Integration {integration_id} not found")

        # Validate user can sync (owns the connection)
        if integration.company_id != company_id:
            raise ValueError("Cannot sync integration not owned by company")

        # Trigger sync
        sync_job_id = integration.trigger_sync(user_id)

        # Save changes
        await self._integration_repository.save(integration)

        return {
            "integration_id": integration.id,
            "sync_job_id": sync_job_id,
            "estimated_completion": (
                datetime.now(timezone.utc) + timedelta(minutes=5)
            ).isoformat()
        }

    async def get_integration_sync_status(
        self,
        integration_id: str,
        company_id: str
    ) -> Dict[str, Any]:
        """Get sync status for an integration"""
        integration = await self._integration_repository.get_by_id(integration_id)
        if not integration:
            raise ValueError(f"Integration {integration_id} not found")

        if not integration.is_connected or integration.company_id != company_id:
            raise ValueError("Integration not connected to this company")

        sync_status = integration.sync_status
        if not sync_status:
            raise ValueError("No sync status available for integration")

        return {
            "integration_id": integration.id,
            "status": sync_status.status,
            "last_sync": sync_status.last_sync.isoformat() if sync_status.last_sync else None,
            "next_sync": sync_status.next_sync.isoformat() if sync_status.next_sync else None,
            "sync_frequency": sync_status.sync_frequency,
            "records_synced": sync_status.records_synced,
            "error_message": sync_status.error_message,
            "sync_job_id": sync_status.sync_job_id
        }

    def get_default_integrations(self) -> List[Integration]:
        """Get default MVP integrations"""
        return [
            Integration.create_email_notifications(),
            Integration.create_calendar_sync(),
            Integration.create_csv_export()
        ]
