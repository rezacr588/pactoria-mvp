"""
In-memory integration repository implementation for MVP
"""

from typing import List, Optional, Dict, Any
from app.domain.entities.integration import Integration, IntegrationCategory, IntegrationStatus
from app.domain.repositories.integration import IntegrationRepository


class InMemoryIntegrationRepository(IntegrationRepository):
    """In-memory implementation of integration repository for MVP"""

    def __init__(self):
        self._integrations: Dict[str, Integration] = {}
        self._populate_default_integrations()

    def _populate_default_integrations(self):
        """Populate with default MVP integrations"""
        default_integrations = [
            Integration.create_email_notifications(),
            Integration.create_calendar_sync(),
            Integration.create_csv_export()
        ]

        # Add some additional example integrations for testing
        from app.domain.entities.integration import IntegrationProvider, IntegrationFeatures, PriceTier
        additional_integrations = [
            # Add test integrations with numeric IDs for compatibility
            Integration(
                integration_id="1",
                name="Test Integration 1",
                description="Test integration for automated tests",
                category=IntegrationCategory.EMAIL,
                provider=IntegrationProvider.PACTORIA,
                status=IntegrationStatus.AVAILABLE,
                price_tier=PriceTier.FREE,
                features=IntegrationFeatures(["Test feature"]),
                setup_time_minutes=5,
                is_popular=False
            ),
            Integration(
                integration_id="2",
                name="Test Integration 2",
                description="Another test integration for automated tests",
                category=IntegrationCategory.CRM,
                provider=IntegrationProvider.HUBSPOT,
                status=IntegrationStatus.CONNECTED,
                price_tier=PriceTier.BASIC,
                features=IntegrationFeatures(["Test feature 2"]),
                setup_time_minutes=10,
                is_popular=True,
                connections_count=50,
                rating=4.2,
                company_id="company_123",  # Match the mock user's company_id
                connected_by_user_id="test_user_123"
            ),
            Integration(
                integration_id="4",
                name="Test Integration 4",
                description="Google Drive like test integration",
                category=IntegrationCategory.STORAGE,
                provider=IntegrationProvider.GOOGLE,
                status=IntegrationStatus.AVAILABLE,
                price_tier=PriceTier.FREE,
                features=IntegrationFeatures(["File storage", "Document sync"]),
                setup_time_minutes=5,
                is_popular=True
            ),
            Integration(
                integration_id="5",
                name="Test Integration 5",
                description="Slack like test integration",
                category=IntegrationCategory.COMMUNICATION,
                provider=IntegrationProvider.SLACK,
                status=IntegrationStatus.AVAILABLE,
                price_tier=PriceTier.FREE,
                features=IntegrationFeatures(["Notifications", "Webhooks"]),
                setup_time_minutes=3,
                is_popular=True
            ),
            Integration(
                integration_id="7",
                name="Test Integration 7",
                description="Error state test integration",
                category=IntegrationCategory.ANALYTICS,
                provider=IntegrationProvider.PACTORIA,
                status=IntegrationStatus.ERROR,
                price_tier=PriceTier.FREE,
                features=IntegrationFeatures(["Error example"]),
                setup_time_minutes=5,
                connections_count=0,
                rating=0.0
            ),
            Integration(
                integration_id="google-drive",
                name="Google Drive",
                description="Store and sync contract documents in Google Drive",
                category=IntegrationCategory.STORAGE,
                provider=IntegrationProvider.GOOGLE,
                status=IntegrationStatus.AVAILABLE,
                price_tier=PriceTier.FREE,
                features=IntegrationFeatures(["Document sync", "Automatic backup", "Team sharing"]),
                setup_time_minutes=5,
                is_popular=True
            ),
            Integration(
                integration_id="slack-notifications",
                name="Slack Notifications",
                description="Get contract updates and alerts in Slack",
                category=IntegrationCategory.COMMUNICATION,
                provider=IntegrationProvider.SLACK,
                status=IntegrationStatus.AVAILABLE,
                price_tier=PriceTier.FREE,
                features=IntegrationFeatures(["Channel notifications", "Direct messages", "Custom alerts"]),
                setup_time_minutes=3,
                is_popular=True
            ),
            Integration(
                integration_id="hubspot-crm",
                name="HubSpot CRM",
                description="Sync contract data with HubSpot CRM",
                category=IntegrationCategory.CRM,
                provider=IntegrationProvider.HUBSPOT,
                status=IntegrationStatus.CONNECTED,  # Pre-connected example
                price_tier=PriceTier.BASIC,
                features=IntegrationFeatures(["Contact sync", "Deal tracking", "Automated workflows"]),
                setup_time_minutes=10,
                is_premium=True,
                connections_count=150,
                rating=4.5,
                company_id="company_123"  # Example connection
            ),
            Integration(
                integration_id="error-integration",
                name="Error Integration",
                description="Example integration in error state",
                category=IntegrationCategory.ANALYTICS,
                provider=IntegrationProvider.PACTORIA,
                status=IntegrationStatus.ERROR,
                price_tier=PriceTier.FREE,
                features=IntegrationFeatures(["Error example"]),
                setup_time_minutes=5,
                connections_count=0,
                rating=0.0
            )
        ]

        all_integrations = default_integrations + additional_integrations

        for integration in all_integrations:
            self._integrations[integration.id] = integration

        # Add sync status to connected integrations for testing
        from app.domain.entities.integration import SyncStatus
        from datetime import datetime, timezone

        # Add sync status to integration "2"
        if "2" in self._integrations:
            self._integrations["2"]._sync_status = SyncStatus(
                status="completed",
                last_sync=datetime.now(timezone.utc),
                records_synced=100,
                sync_frequency="daily"
            )

        # Add sync status with error to integration "7"
        if "7" in self._integrations:
            self._integrations["7"]._sync_status = SyncStatus(
                status="error",
                last_sync=datetime.now(timezone.utc),
                records_synced=0,
                sync_frequency="manual",
                error_message="API connection failed"
            )

    async def get_by_id(self, integration_id: str) -> Optional[Integration]:
        """Get integration by ID"""
        return self._integrations.get(integration_id)

    async def get_all(self) -> List[Integration]:
        """Get all available integrations"""
        return list(self._integrations.values())

    async def get_by_company(self, company_id: str) -> List[Integration]:
        """Get integrations for a company (connected ones)"""
        return [
            integration for integration in self._integrations.values()
            if integration.is_connected and integration.company_id == company_id
        ]

    async def get_filtered(
        self,
        category: Optional[IntegrationCategory] = None,
        status: Optional[IntegrationStatus] = None,
        price_tier: Optional[str] = None,
        popular_only: Optional[bool] = None,
        search: Optional[str] = None,
        company_id: Optional[str] = None
    ) -> List[Integration]:
        """Get integrations with filters"""
        integrations = list(self._integrations.values())

        # Filter by category
        if category:
            integrations = [i for i in integrations if i.category == category]

        # Filter by status
        if status:
            integrations = [i for i in integrations if i.status == status]

        # Filter by price tier
        if price_tier:
            integrations = [i for i in integrations if i.price_tier.value == price_tier]

        # Filter popular only
        if popular_only:
            integrations = [i for i in integrations if i.is_popular]

        # Filter by search term
        if search:
            search_lower = search.lower()
            integrations = [
                i for i in integrations
                if (search_lower in i.name.lower() or
                    search_lower in i.description.lower())
            ]

        # Filter by company (show connected ones for that company)
        if company_id:
            integrations = [
                i for i in integrations
                if (i.status == IntegrationStatus.AVAILABLE or
                    (i.is_connected and i.company_id == company_id))
            ]

        return integrations

    async def save(self, integration: Integration) -> None:
        """Save or update integration"""
        self._integrations[integration.id] = integration

    async def delete(self, integration_id: str) -> None:
        """Delete integration"""
        if integration_id in self._integrations:
            del self._integrations[integration_id]

    async def get_categories_stats(self) -> Dict[str, int]:
        """Get integration counts by category"""
        stats = {}
        for category in IntegrationCategory:
            stats[category.value] = len([
                i for i in self._integrations.values()
                if i.category == category
            ])
        return stats

    async def get_status_stats(self) -> Dict[str, int]:
        """Get integration counts by status"""
        stats = {}
        for status in IntegrationStatus:
            stats[status.value] = len([
                i for i in self._integrations.values()
                if i.status == status
            ])
        return stats

    async def get_popular_integrations(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get most popular integrations with stats"""
        popular = sorted(
            [i for i in self._integrations.values() if i.is_popular],
            key=lambda x: (x.connections_count, x.rating),
            reverse=True
        )[:limit]

        return [
            {
                "name": integration.name,
                "connections": integration.connections_count,
                "rating": integration.rating,
                "category": integration.category.value
            }
            for integration in popular
        ]
