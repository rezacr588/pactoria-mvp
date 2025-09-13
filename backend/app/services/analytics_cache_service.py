"""
Analytics caching service for performance optimization
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from functools import wraps
import hashlib
import json
import logging

logger = logging.getLogger(__name__)

class AnalyticsCacheService:
    """
    In-memory cache service for analytics queries with TTL support
    """
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()
        
    async def get(self, key: str) -> Optional[Any]:
        """Get cached value if it exists and hasn't expired"""
        async with self._lock:
            if key in self._cache:
                entry = self._cache[key]
                if datetime.utcnow() < entry['expires_at']:
                    logger.debug(f"Cache hit for key: {key}")
                    return entry['value']
                else:
                    # Expired, remove it
                    del self._cache[key]
                    logger.debug(f"Cache expired for key: {key}")
            
            logger.debug(f"Cache miss for key: {key}")
            return None
    
    async def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set cached value with TTL (default 5 minutes)"""
        async with self._lock:
            self._cache[key] = {
                'value': value,
                'expires_at': datetime.utcnow() + timedelta(seconds=ttl_seconds),
                'created_at': datetime.utcnow()
            }
            logger.debug(f"Cache set for key: {key}, TTL: {ttl_seconds}s")
    
    async def invalidate(self, pattern: str = None):
        """Invalidate cache entries matching pattern or all if no pattern"""
        async with self._lock:
            if pattern:
                keys_to_remove = [k for k in self._cache.keys() if pattern in k]
                for key in keys_to_remove:
                    del self._cache[key]
                logger.debug(f"Invalidated {len(keys_to_remove)} cache entries matching: {pattern}")
            else:
                self._cache.clear()
                logger.debug("Invalidated all cache entries")
    
    async def cleanup_expired(self):
        """Remove expired cache entries"""
        async with self._lock:
            now = datetime.utcnow()
            expired_keys = [
                key for key, entry in self._cache.items() 
                if now >= entry['expires_at']
            ]
            for key in expired_keys:
                del self._cache[key]
            
            if expired_keys:
                logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_entries = len(self._cache)
        now = datetime.utcnow()
        expired_count = sum(1 for entry in self._cache.values() if now >= entry['expires_at'])
        
        return {
            'total_entries': total_entries,
            'active_entries': total_entries - expired_count,
            'expired_entries': expired_count,
            'memory_usage_estimate': sum(len(str(v)) for v in self._cache.values())
        }

# Global cache instance
analytics_cache = AnalyticsCacheService()

def cache_analytics_result(ttl_seconds: int = 300, include_company_id: bool = True):
    """
    Decorator to cache analytics function results
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and parameters
            cache_key_parts = [func.__name__]
            
            # Include company ID in cache key if requested
            if include_company_id:
                # Look for company parameter in kwargs or args
                company = kwargs.get('company')
                if company is None and args:
                    # Try to find company in args (usually first arg after self)
                    for arg in args:
                        if hasattr(arg, 'id'):
                            company = arg
                            break
                
                if company and hasattr(company, 'id'):
                    cache_key_parts.append(f"company_{company.id}")
            
            # Add other relevant parameters to cache key
            for key, value in kwargs.items():
                if key not in ['db', 'company'] and value is not None:
                    cache_key_parts.append(f"{key}_{value}")
            
            cache_key = "_".join(cache_key_parts)
            
            # Try to get from cache first
            cached_result = await analytics_cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Returning cached result for {func.__name__}")
                return cached_result
            
            # Execute function and cache result
            start_time = datetime.utcnow()
            result = await func(*args, **kwargs)
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            logger.debug(f"Analytics function {func.__name__} executed in {execution_time:.3f}s")
            
            # Cache the result
            await analytics_cache.set(cache_key, result, ttl_seconds)
            
            return result
        
        return wrapper
    return decorator

async def invalidate_company_analytics_cache(company_id: str):
    """Invalidate all analytics cache entries for a specific company"""
    await analytics_cache.invalidate(f"company_{company_id}")
    logger.info(f"Invalidated analytics cache for company: {company_id}")

# Background task to cleanup expired cache entries
async def start_cache_cleanup_task():
    """Start background task to periodically clean up expired cache entries"""
    while True:
        try:
            await asyncio.sleep(300)  # Run every 5 minutes
            await analytics_cache.cleanup_expired()
        except Exception as e:
            logger.error(f"Error in cache cleanup task: {e}")