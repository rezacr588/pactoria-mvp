"""
Domain Event Publisher Implementation
Publishes domain events to registered handlers following DDD patterns
"""

import asyncio
import logging
from typing import Dict, List, Set
from collections import defaultdict

from app.domain.entities.base import DomainEvent
from app.domain.event_publishing.domain_event_handler import DomainEventHandler

logger = logging.getLogger(__name__)


class DomainEventPublisher:
    """
    Domain Event Publisher - routes events to appropriate handlers
    Implements fire-and-forget semantics with error isolation
    """

    def __init__(self):
        self._handlers: Dict[str, Set[DomainEventHandler]] = defaultdict(set)
        self._logger = logging.getLogger(self.__class__.__name__)

    def register_handler(self, event_type: str, handler: DomainEventHandler) -> None:
        """Register a handler for a specific event type"""
        self._handlers[event_type].add(handler)
        self._logger.info(
            f"Registered handler {handler.__class__.__name__} for event type {event_type}"
        )

    def register_global_handler(self, handler: DomainEventHandler) -> None:
        """Register a handler for all event types"""
        self.register_handler("*", handler)

    def unregister_handler(self, event_type: str, handler: DomainEventHandler) -> None:
        """Unregister a handler for a specific event type"""
        if event_type in self._handlers:
            self._handlers[event_type].discard(handler)
            if not self._handlers[event_type]:
                del self._handlers[event_type]

    def get_handlers(self, event_type: str) -> List[DomainEventHandler]:
        """Get all handlers for a specific event type"""
        handlers = set()

        # Add specific handlers
        handlers.update(self._handlers.get(event_type, set()))

        # Add global handlers
        handlers.update(self._handlers.get("*", set()))

        return list(handlers)

    async def publish(self, event: DomainEvent) -> None:
        """
        Publish an event to all registered handlers
        Handles each handler independently to prevent failure cascade
        """
        handlers = self.get_handlers(event.event_type)

        if not handlers:
            self._logger.debug(
                f"No handlers registered for event type {event.event_type}"
            )
            return

        self._logger.info(
            f"Publishing event {event.event_type} to {len(handlers)} handlers"
        )

        # Execute all handlers concurrently
        tasks = []
        for handler in handlers:
            task = self._handle_event_safely(handler, event)
            tasks.append(task)

        # Wait for all handlers to complete
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _handle_event_safely(
        self, handler: DomainEventHandler, event: DomainEvent
    ) -> None:
        """Handle event with error isolation - failures don't affect other handlers"""
        try:
            await handler.handle(event)
        except Exception as e:
            self._logger.error(
                f"Handler {handler.__class__.__name__} failed to process event {event.event_type}: {str(e)}",
                exc_info=True,
            )
            # Don't re-raise - we want to continue processing other handlers

    def clear_handlers(self) -> None:
        """Clear all registered handlers - useful for testing"""
        self._handlers.clear()

    def get_handler_count(self) -> int:
        """Get total number of registered handlers"""
        total = 0
        for handlers in self._handlers.values():
            total += len(handlers)
        return total


class InMemoryDomainEventPublisher(DomainEventPublisher):
    """In-memory implementation suitable for single-process applications"""

    def __init__(self):
        super().__init__()
        self._published_events: List[DomainEvent] = []

    async def publish(self, event: DomainEvent) -> None:
        """Publish event and store for testing/debugging"""
        self._published_events.append(event)
        await super().publish(event)

    def get_published_events(self) -> List[DomainEvent]:
        """Get all published events - useful for testing"""
        return self._published_events.copy()

    def clear_published_events(self) -> None:
        """Clear published events history"""
        self._published_events.clear()


class AsyncDomainEventPublisher(DomainEventPublisher):
    """
    Asynchronous publisher that queues events for background processing
    Useful for high-throughput scenarios where event processing shouldn't block
    """

    def __init__(self, max_queue_size: int = 1000):
        super().__init__()
        self._event_queue = asyncio.Queue(maxsize=max_queue_size)
        self._processing_task = None
        self._shutdown_event = asyncio.Event()

    async def start(self) -> None:
        """Start background event processing"""
        if self._processing_task is None:
            self._processing_task = asyncio.create_task(self._process_events())
            self._logger.info("Started async event processing")

    async def stop(self) -> None:
        """Stop background event processing"""
        if self._processing_task:
            self._shutdown_event.set()
            await self._processing_task
            self._processing_task = None
            self._logger.info("Stopped async event processing")

    async def publish(self, event: DomainEvent) -> None:
        """Queue event for asynchronous processing"""
        try:
            self._event_queue.put_nowait(event)
        except asyncio.QueueFull:
            self._logger.warning(f"Event queue full, dropping event {event.event_type}")

    async def _process_events(self) -> None:
        """Background task to process queued events"""
        while not self._shutdown_event.is_set():
            try:
                # Wait for event with timeout to allow checking shutdown
                event = await asyncio.wait_for(self._event_queue.get(), timeout=1.0)
                await super().publish(event)
                self._event_queue.task_done()
            except asyncio.TimeoutError:
                continue  # Check shutdown condition
            except Exception as e:
                self._logger.error(f"Error processing event: {str(e)}", exc_info=True)
