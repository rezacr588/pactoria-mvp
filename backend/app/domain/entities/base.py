"""
Base entity and aggregate root classes for DDD implementation
"""
from abc import ABC, abstractmethod
from typing import Any, List, TypeVar, Generic
from datetime import datetime, timezone
from dataclasses import dataclass
from uuid import uuid4


EntityId = TypeVar('EntityId')


@dataclass(frozen=True)
class DomainEvent:
    """Base class for domain events"""
    event_id: str
    occurred_at: datetime
    aggregate_id: str
    event_type: str
    
    @classmethod
    def create(cls, aggregate_id: str, event_type: str, **kwargs):
        """Factory method to create domain events"""
        return cls(
            event_id=str(uuid4()),
            occurred_at=datetime.now(timezone.utc),
            aggregate_id=aggregate_id,
            event_type=event_type,
            **kwargs
        )


class Entity(ABC, Generic[EntityId]):
    """Base entity class following DDD patterns"""
    
    def __init__(self, entity_id: EntityId):
        self._id = entity_id
        self._version = 1
        self._created_at = datetime.now(timezone.utc)
        self._updated_at = None
    
    @property
    def id(self) -> EntityId:
        """Entity identifier"""
        return self._id
    
    @property
    def version(self) -> int:
        """Entity version for optimistic concurrency"""
        return self._version
    
    @property
    def created_at(self) -> datetime:
        """Entity creation timestamp"""
        return self._created_at
    
    @property
    def updated_at(self) -> datetime:
        """Entity last update timestamp"""
        return self._updated_at
    
    def _increment_version(self):
        """Increment version and update timestamp"""
        self._version += 1
        self._updated_at = datetime.now(timezone.utc)
    
    def __eq__(self, other):
        """Entities are equal if they have the same ID"""
        if not isinstance(other, Entity):
            return False
        return self._id == other._id
    
    def __hash__(self):
        """Hash based on entity ID"""
        return hash(self._id)


class AggregateRoot(Entity[EntityId]):
    """Base aggregate root class following DDD patterns"""
    
    def __init__(self, entity_id: EntityId):
        super().__init__(entity_id)
        self._domain_events: List[DomainEvent] = []
    
    def add_domain_event(self, event: DomainEvent):
        """Add domain event to be published"""
        self._domain_events.append(event)
    
    def clear_domain_events(self):
        """Clear domain events after publishing"""
        self._domain_events.clear()
    
    def get_domain_events(self) -> List[DomainEvent]:
        """Get unpublished domain events"""
        return self._domain_events.copy()
    
    def has_domain_events(self) -> bool:
        """Check if there are unpublished domain events"""
        return len(self._domain_events) > 0