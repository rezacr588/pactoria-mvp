"""
Query performance monitoring for analytics endpoints
"""

import time
import logging
from contextlib import contextmanager
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class QueryPerformanceMonitor:
    """Monitor and log query performance for analytics operations"""
    
    def __init__(self):
        self.query_stats: Dict[str, Dict[str, Any]] = {}
        self.slow_query_threshold = 1.0  # seconds
        
    @contextmanager
    def monitor_query(self, query_name: str, company_id: Optional[str] = None):
        """Context manager to monitor query execution time"""
        start_time = time.time()
        start_datetime = datetime.utcnow()
        
        try:
            yield
        finally:
            execution_time = time.time() - start_time
            
            # Log slow queries
            if execution_time > self.slow_query_threshold:
                logger.warning(
                    f"Slow query detected: {query_name} took {execution_time:.3f}s "
                    f"(company: {company_id})"
                )
            else:
                logger.debug(
                    f"Query executed: {query_name} took {execution_time:.3f}s "
                    f"(company: {company_id})"
                )
            
            # Update statistics
            self._update_stats(query_name, execution_time, start_datetime)
    
    def _update_stats(self, query_name: str, execution_time: float, timestamp: datetime):
        """Update query performance statistics"""
        if query_name not in self.query_stats:
            self.query_stats[query_name] = {
                'total_executions': 0,
                'total_time': 0.0,
                'min_time': float('inf'),
                'max_time': 0.0,
                'avg_time': 0.0,
                'last_execution': None,
                'slow_queries': 0
            }
        
        stats = self.query_stats[query_name]
        stats['total_executions'] += 1
        stats['total_time'] += execution_time
        stats['min_time'] = min(stats['min_time'], execution_time)
        stats['max_time'] = max(stats['max_time'], execution_time)
        stats['avg_time'] = stats['total_time'] / stats['total_executions']
        stats['last_execution'] = timestamp
        
        if execution_time > self.slow_query_threshold:
            stats['slow_queries'] += 1
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive performance report"""
        report = {
            'query_statistics': {},
            'summary': {
                'total_queries': 0,
                'total_slow_queries': 0,
                'average_execution_time': 0.0,
                'slowest_query': None,
                'most_frequent_query': None
            }
        }
        
        if not self.query_stats:
            return report
        
        total_executions = sum(stats['total_executions'] for stats in self.query_stats.values())
        total_time = sum(stats['total_time'] for stats in self.query_stats.values())
        total_slow_queries = sum(stats['slow_queries'] for stats in self.query_stats.values())
        
        # Find slowest and most frequent queries
        slowest_query = max(self.query_stats.items(), key=lambda x: x[1]['max_time'])
        most_frequent_query = max(self.query_stats.items(), key=lambda x: x[1]['total_executions'])
        
        # Build summary
        report['summary'] = {
            'total_queries': total_executions,
            'total_slow_queries': total_slow_queries,
            'average_execution_time': total_time / total_executions if total_executions > 0 else 0.0,
            'slowest_query': {
                'name': slowest_query[0],
                'max_time': slowest_query[1]['max_time']
            },
            'most_frequent_query': {
                'name': most_frequent_query[0],
                'executions': most_frequent_query[1]['total_executions']
            }
        }
        
        # Copy detailed stats
        report['query_statistics'] = dict(self.query_stats)
        
        return report
    
    def reset_stats(self):
        """Reset all performance statistics"""
        self.query_stats.clear()
        logger.info("Query performance statistics reset")

# Global monitor instance
query_monitor = QueryPerformanceMonitor()

def log_query_performance(query_name: str):
    """Decorator to log query performance"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            company_id = None
            
            # Try to extract company ID from arguments
            for arg in args:
                if hasattr(arg, 'id'):
                    company_id = arg.id
                    break
            
            if not company_id and 'company' in kwargs:
                company = kwargs['company']
                if hasattr(company, 'id'):
                    company_id = company.id
            
            with query_monitor.monitor_query(query_name, company_id):
                return await func(*args, **kwargs)
        
        return wrapper
    return decorator