"""
Tests for Domain Event Publishing Infrastructure
Following TDD - test domain event publishing and handler execution
"""

import pytest
from unittest.mock import AsyncMock, Mock
from typing import List

from app.domain.entities.base import DomainEvent
from app.domain.entities.contract import ContractCreated, ContractActivated
from app.domain.event_publishing.domain_event_publisher import DomainEventPublisher
from app.domain.event_publishing.domain_event_handler import DomainEventHandler


class TestDomainEventPublisher:
    """Test domain event publishing functionality"""

    def test_domain_event_publisher_can_register_handlers(self):
        """Test that handlers can be registered for specific event types"""
        # Given
        publisher = DomainEventPublisher()
        handler = Mock(spec=DomainEventHandler)

        # When
        publisher.register_handler("ContractCreated", handler)

        # Then
        assert len(publisher.get_handlers("ContractCreated")) == 1
        assert handler in publisher.get_handlers("ContractCreated")

    def test_domain_event_publisher_can_register_multiple_handlers_for_same_event(self):
        """Test multiple handlers for the same event type"""
        # Given
        publisher = DomainEventPublisher()
        handler1 = Mock(spec=DomainEventHandler)
        handler2 = Mock(spec=DomainEventHandler)

        # When
        publisher.register_handler("ContractCreated", handler1)
        publisher.register_handler("ContractCreated", handler2)

        # Then
        handlers = publisher.get_handlers("ContractCreated")
        assert len(handlers) == 2
        assert handler1 in handlers
        assert handler2 in handlers

    @pytest.mark.asyncio
    async def test_domain_event_publisher_publishes_events_to_registered_handlers(self):
        """Test that events are published to all registered handlers"""
        # Given
        publisher = DomainEventPublisher()
        handler1 = AsyncMock(spec=DomainEventHandler)
        handler2 = AsyncMock(spec=DomainEventHandler)

        publisher.register_handler("ContractCreated", handler1)
        publisher.register_handler("ContractCreated", handler2)

        event = ContractCreated.create(
            aggregate_id="contract-123",
            event_type="ContractCreated",
            contract_title="Test Contract",
            contract_type="service_agreement",
            client_name="Test Client",
            created_by_user_id="user-123",
            company_id="company-456",
        )

        # When
        await publisher.publish(event)

        # Then
        handler1.handle.assert_called_once_with(event)
        handler2.handle.assert_called_once_with(event)

    @pytest.mark.asyncio
    async def test_domain_event_publisher_handles_no_registered_handlers(self):
        """Test publishing event with no registered handlers doesn't fail"""
        # Given
        publisher = DomainEventPublisher()
        event = ContractCreated.create(
            aggregate_id="contract-123",
            event_type="ContractCreated",
            contract_title="Test Contract",
            contract_type="service_agreement",
            client_name="Test Client",
            created_by_user_id="user-123",
            company_id="company-456",
        )

        # When & Then (should not raise exception)
        await publisher.publish(event)

    @pytest.mark.asyncio
    async def test_domain_event_publisher_continues_on_handler_failure(self):
        """Test that publisher continues if one handler fails"""
        # Given
        publisher = DomainEventPublisher()
        failing_handler = AsyncMock(spec=DomainEventHandler)
        failing_handler.handle.side_effect = Exception("Handler failed")
        successful_handler = AsyncMock(spec=DomainEventHandler)

        publisher.register_handler("ContractCreated", failing_handler)
        publisher.register_handler("ContractCreated", successful_handler)

        event = ContractCreated.create(
            aggregate_id="contract-123",
            event_type="ContractCreated",
            contract_title="Test Contract",
            contract_type="service_agreement",
            client_name="Test Client",
            created_by_user_id="user-123",
            company_id="company-456",
        )

        # When
        await publisher.publish(event)

        # Then - both handlers should have been called despite the failure
        failing_handler.handle.assert_called_once_with(event)
        successful_handler.handle.assert_called_once_with(event)


class TestDomainEventHandler:
    """Test domain event handler interface and implementations"""

    @pytest.mark.asyncio
    async def test_contract_created_event_handler_processes_event(self):
        """Test that ContractCreated event handler processes the event correctly"""
        # This will test specific handler implementations
        pass

    @pytest.mark.asyncio
    async def test_contract_activated_event_handler_processes_event(self):
        """Test that ContractActivated event handler processes the event correctly"""
        # This will test specific handler implementations
        pass


class TestDomainEventIntegration:
    """Integration tests for domain event publishing"""

    @pytest.mark.asyncio
    async def test_contract_creation_publishes_domain_event(self):
        """Test that creating a contract publishes the appropriate domain event"""
        # This will test integration with application service
        pass

    @pytest.mark.asyncio
    async def test_contract_activation_publishes_domain_event(self):
        """Test that activating a contract publishes the appropriate domain event"""
        # This will test integration with application service
        pass
