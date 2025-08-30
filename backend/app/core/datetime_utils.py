"""
Datetime utilities for Pactoria MVP
Provides timezone-aware datetime functions to replace deprecated datetime.utcnow()
"""
from datetime import datetime, UTC


def get_current_utc() -> datetime:
    """
    Get current UTC datetime in timezone-aware format.
    Replaces deprecated datetime.utcnow()
    """
    return datetime.now(UTC)


def ensure_utc(dt: datetime) -> datetime:
    """
    Ensure datetime is in UTC timezone.
    Converts naive datetimes to UTC-aware.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def utc_from_timestamp(timestamp: float) -> datetime:
    """
    Create UTC datetime from timestamp.
    """
    return datetime.fromtimestamp(timestamp, UTC)