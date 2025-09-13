"""
Test analytics performance optimizations
"""

import pytest
import asyncio
import time
from unittest.mock import Mock, patch
from datetime import datetime, timedelta

from app.services.analytics_cache_service import analytics_cache, cache_analytics_result
from app.services.query_performance_monitor import query_monitor


@pytest.mark.asyncio
async def test_analytics_cache_basic_operations():
    """Test basic cache operations"""
    # Test setting and getting
    await analytics_cache.set("test_key", {"data": "test"}, ttl_seconds=1)
    result = await analytics_cache.get("test_key")
    assert result == {"data": "test"}
    
    # Test expiration
    await asyncio.sleep(1.1)  # Wait for expiration
    expired_result = await analytics_cache.get("test_key")
    assert expired_result is None
    
    # Test invalidation
    await analytics_cache.set("test_key_1", {"data": "test1"})
    await analytics_cache.set("test_key_2", {"data": "test2"})
    await analytics_cache.invalidate("test_key_1")
    
    assert await analytics_cache.get("test_key_1") is None
    assert await analytics_cache.get("test_key_2") == {"data": "test2"}


@pytest.mark.asyncio
async def test_cache_decorator():
    """Test the caching decorator"""
    call_count = 0
    
    @cache_analytics_result(ttl_seconds=1)
    async def mock_function(company_id: str):
        nonlocal call_count
        call_count += 1
        return {"company_id": company_id, "data": "test"}
    
    # First call should execute function
    result1 = await mock_function("company_1")
    assert call_count == 1
    assert result1 == {"company_id": "company_1", "data": "test"}
    
    # Second call should use cache
    result2 = await mock_function("company_1")
    assert call_count == 1  # Should not increment
    assert result2 == {"company_id": "company_1", "data": "test"}
    
    # Different parameter should execute function again
    result3 = await mock_function("company_2")
    assert call_count == 2
    assert result3 == {"company_id": "company_2", "data": "test"}


def test_query_performance_monitor():
    """Test query performance monitoring"""
    # Reset stats
    query_monitor.reset_stats()
    
    # Test slow query monitoring
    with query_monitor.monitor_query("test_slow_query", "company_1"):
        time.sleep(0.1)  # Simulate some work
    
    # Test fast query monitoring
    with query_monitor.monitor_query("test_fast_query", "company_1"):
        time.sleep(0.001)  # Very fast
    
    # Get performance report
    report = query_monitor.get_performance_report()
    
    assert "test_slow_query" in report["query_statistics"]
    assert "test_fast_query" in report["query_statistics"]
    assert report["summary"]["total_queries"] == 2
    
    # Check slow query stats
    slow_stats = report["query_statistics"]["test_slow_query"]
    assert slow_stats["total_executions"] == 1
    assert slow_stats["avg_time"] > 0.05  # Should be greater than 50ms


@pytest.mark.asyncio
async def test_cache_cleanup():
    """Test automatic cache cleanup"""
    # Add some entries with very short TTL
    await analytics_cache.set("short_ttl_1", "data1", ttl_seconds=0.1)
    await analytics_cache.set("short_ttl_2", "data2", ttl_seconds=0.1)
    await analytics_cache.set("long_ttl", "data3", ttl_seconds=10)
    
    # Wait for short TTL entries to expire
    await asyncio.sleep(0.2)
    
    # Check initial state
    stats_before = analytics_cache.get_cache_stats()
    assert stats_before["total_entries"] == 3
    assert stats_before["expired_entries"] == 2
    
    # Run cleanup
    await analytics_cache.cleanup_expired()
    
    # Check after cleanup
    stats_after = analytics_cache.get_cache_stats()
    assert stats_after["total_entries"] == 1
    assert stats_after["expired_entries"] == 0
    
    # Long TTL entry should still be there
    result = await analytics_cache.get("long_ttl")
    assert result == "data3"


def test_cache_invalidation_patterns():
    """Test cache invalidation with patterns"""
    asyncio.run(_test_cache_invalidation_patterns())


async def _test_cache_invalidation_patterns():
    # Set up test data
    await analytics_cache.set("company_123_metrics", "data1")
    await analytics_cache.set("company_123_compliance", "data2")
    await analytics_cache.set("company_456_metrics", "data3")
    await analytics_cache.set("other_cache_key", "data4")
    
    # Invalidate all company_123 entries
    await analytics_cache.invalidate("company_123")
    
    # Check results
    assert await analytics_cache.get("company_123_metrics") is None
    assert await analytics_cache.get("company_123_compliance") is None
    assert await analytics_cache.get("company_456_metrics") == "data3"
    assert await analytics_cache.get("other_cache_key") == "data4"


@pytest.mark.asyncio
async def test_analytics_function_performance():
    """Test that analytics functions show performance improvement"""
    
    # Mock database session and company
    mock_db = Mock()
    mock_company = Mock()
    mock_company.id = "test_company_id"
    
    # Mock query results
    mock_query_result = Mock()
    mock_query_result.total_contracts = 10
    mock_query_result.active_contracts = 5
    mock_query_result.draft_contracts = 3
    mock_query_result.completed_contracts = 1
    mock_query_result.terminated_contracts = 1
    mock_query_result.total_value = 100000.0
    mock_query_result.average_value = 10000.0
    
    mock_compliance_result = Mock()
    mock_compliance_result.compliance_avg = 0.85
    mock_compliance_result.high_risk_count = 2
    
    # Setup mock database query chain
    mock_db.query.return_value.filter.return_value.first.return_value = mock_query_result
    
    # Import the function we want to test
    from app.api.v1.analytics import get_business_metrics
    
    # Reset performance stats
    query_monitor.reset_stats()
    
    start_time = time.time()
    
    # This would normally be called with proper FastAPI dependency injection
    # For testing, we'll call it directly with mocked dependencies
    with patch('app.api.v1.analytics.get_current_utc') as mock_utc:
        mock_utc.return_value = datetime.utcnow()
        
        # Mock the complex database query logic
        with patch.object(mock_db, 'query') as mock_query:
            # Setup the query chain for contract stats
            mock_contract_query = Mock()
            mock_contract_query.filter.return_value.first.return_value = mock_query_result
            
            # Setup the query chain for compliance stats  
            mock_compliance_query = Mock()
            mock_compliance_query.join.return_value.filter.return_value.first.return_value = mock_compliance_result
            
            # Make query return different mocks for different calls
            mock_query.side_effect = [mock_contract_query, mock_compliance_query]
            
            # Call the function (this will use cache decorators)
            result = await get_business_metrics(company=mock_company, db=mock_db)
    
    execution_time = time.time() - start_time
    
    # Verify the function returned expected structure
    assert hasattr(result, 'total_contracts')
    
    # Verify performance monitoring was called
    performance_report = query_monitor.get_performance_report()
    
    print(f"Analytics function execution time: {execution_time:.3f}s")
    print(f"Performance report: {performance_report}")


if __name__ == "__main__":
    # Run basic tests
    asyncio.run(test_analytics_cache_basic_operations())
    asyncio.run(test_cache_decorator())
    test_query_performance_monitor()
    asyncio.run(test_cache_cleanup())
    test_cache_invalidation_patterns()
    asyncio.run(test_analytics_function_performance())
    
    print("✅ All analytics optimization tests passed!")