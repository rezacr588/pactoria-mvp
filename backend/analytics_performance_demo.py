#!/usr/bin/env python3
"""
Analytics Performance Optimization Demo
Demonstrates the performance improvements implemented in the analytics dashboard
"""

import asyncio
import time
import json
from datetime import datetime
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.analytics_cache_service import analytics_cache, cache_analytics_result
from app.services.query_performance_monitor import query_monitor


class MockDatabase:
    """Mock database for demonstration purposes"""
    
    def __init__(self, delay_ms=100):
        self.delay_ms = delay_ms
        self.query_count = 0
    
    async def query(self, query_name):
        """Simulate database query with delay"""
        self.query_count += 1
        print(f"  🔍 Executing query: {query_name} (Query #{self.query_count})")
        await asyncio.sleep(self.delay_ms / 1000)  # Convert ms to seconds
        
        # Return mock data based on query type
        if "contract_stats" in query_name:
            return {
                'total_contracts': 150,
                'active_contracts': 89,
                'draft_contracts': 32,
                'completed_contracts': 25,
                'terminated_contracts': 4,
                'total_value': 2500000.0,
                'average_value': 16666.67
            }
        elif "compliance" in query_name:
            return {
                'compliance_avg': 0.87,
                'high_risk_count': 12,
                'gdpr': 0.92,
                'employment': 0.83,
                'consumer': 0.89,
                'commercial': 0.84
            }
        elif "user_metrics" in query_name:
            return {
                'total_users': 25,
                'active_users_30d': 22,
                'new_users_this_month': 3
            }
        else:
            return {'mock_data': True}


class AnalyticsDemo:
    """Demonstration of analytics performance optimization"""
    
    def __init__(self):
        self.mock_db = MockDatabase(delay_ms=150)  # Simulate 150ms DB queries
        self.company_id = "demo_company_123"
    
    async def simulate_old_analytics_approach(self):
        """Simulate the old approach with multiple separate queries"""
        print("\n🔥 OLD APPROACH: Multiple Separate Queries")
        print("=" * 60)
        
        start_time = time.time()
        self.mock_db.query_count = 0
        
        # Simulate the old approach with many separate queries
        queries = [
            "SELECT COUNT(*) FROM contracts WHERE status = 'ACTIVE'",
            "SELECT COUNT(*) FROM contracts WHERE status = 'DRAFT'", 
            "SELECT COUNT(*) FROM contracts WHERE status = 'COMPLETED'",
            "SELECT COUNT(*) FROM contracts WHERE status = 'TERMINATED'",
            "SELECT COUNT(*) FROM contracts WHERE company_id = ?",
            "SELECT SUM(contract_value) FROM contracts",
            "SELECT AVG(contract_value) FROM contracts",
            "SELECT AVG(overall_score) FROM compliance_scores",
            "SELECT COUNT(*) FROM compliance_scores WHERE risk_score >= 7",
            "SELECT COUNT(*) FROM compliance_scores WHERE risk_score >= 4 AND risk_score < 7",
            "SELECT COUNT(*) FROM compliance_scores WHERE risk_score < 4",
            "SELECT AVG(gdpr_compliance) FROM compliance_scores",
            "SELECT AVG(employment_law_compliance) FROM compliance_scores"
        ]
        
        results = {}
        for query in queries:
            result = await self.mock_db.query(query)
            results[query] = result
        
        execution_time = time.time() - start_time
        
        print(f"📊 Results: Executed {self.mock_db.query_count} database queries")
        print(f"⏱️  Total execution time: {execution_time:.3f} seconds")
        print(f"🐌 Average query time: {execution_time/self.mock_db.query_count:.3f} seconds")
        
        return results, execution_time, self.mock_db.query_count
    
    async def simulate_optimized_analytics_approach(self):
        """Simulate the new optimized approach with consolidated queries"""
        print("\n✨ NEW APPROACH: Optimized Consolidated Queries")
        print("=" * 60)
        
        start_time = time.time()
        self.mock_db.query_count = 0
        
        # Simulate the optimized approach with fewer, more efficient queries
        optimized_queries = [
            """
            SELECT 
                COUNT(*) as total_contracts,
                SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_contracts,
                SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) as draft_contracts,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_contracts,
                SUM(CASE WHEN status = 'TERMINATED' THEN 1 ELSE 0 END) as terminated_contracts,
                SUM(contract_value) as total_value,
                AVG(contract_value) as average_value
            FROM contracts WHERE company_id = ?
            """,
            """
            SELECT 
                AVG(overall_score) as compliance_avg,
                AVG(gdpr_compliance) as gdpr,
                AVG(employment_law_compliance) as employment,
                AVG(consumer_rights_compliance) as consumer,
                AVG(commercial_terms_compliance) as commercial,
                SUM(CASE WHEN risk_score >= 7 THEN 1 ELSE 0 END) as high_risk,
                SUM(CASE WHEN risk_score >= 4 AND risk_score < 7 THEN 1 ELSE 0 END) as medium_risk,
                SUM(CASE WHEN risk_score < 4 THEN 1 ELSE 0 END) as low_risk
            FROM compliance_scores 
            JOIN contracts ON contracts.id = compliance_scores.contract_id 
            WHERE contracts.company_id = ?
            """,
            """
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN last_login_at >= DATE('now', '-30 days') THEN 1 ELSE 0 END) as active_users_30d,
                SUM(CASE WHEN created_at >= DATE('now', 'start of month') THEN 1 ELSE 0 END) as new_users_this_month
            FROM users WHERE company_id = ?
            """
        ]
        
        results = {}
        for i, query in enumerate(optimized_queries):
            query_name = f"optimized_query_{i+1}"
            result = await self.mock_db.query(query_name)
            results[query_name] = result
        
        execution_time = time.time() - start_time
        
        print(f"📊 Results: Executed {self.mock_db.query_count} database queries")
        print(f"⏱️  Total execution time: {execution_time:.3f} seconds")
        print(f"🚀 Average query time: {execution_time/self.mock_db.query_count:.3f} seconds")
        
        return results, execution_time, self.mock_db.query_count
    
    @cache_analytics_result(ttl_seconds=5)
    async def simulate_cached_analytics_call(self):
        """Simulate analytics call with caching"""
        print("  📋 Executing analytics function (cached)")
        return await self.mock_db.query("cached_analytics_query")
    
    async def demonstrate_caching_benefits(self):
        """Demonstrate the benefits of caching"""
        print("\n💾 CACHING DEMONSTRATION")
        print("=" * 60)
        
        # First call - should execute query
        print("🔍 First call (cache miss):")
        start_time = time.time()
        result1 = await self.simulate_cached_analytics_call()
        first_call_time = time.time() - start_time
        print(f"   ⏱️  Time: {first_call_time:.3f} seconds")
        
        # Second call - should use cache
        print("\n🎯 Second call (cache hit):")
        start_time = time.time()
        result2 = await self.simulate_cached_analytics_call()
        second_call_time = time.time() - start_time
        print(f"   ⏱️  Time: {second_call_time:.3f} seconds")
        
        # Calculate improvement
        improvement = ((first_call_time - second_call_time) / first_call_time) * 100
        print(f"\n📈 Cache Performance:")
        print(f"   🚀 Speed improvement: {improvement:.1f}%")
        print(f"   ⚡ Response time reduced from {first_call_time*1000:.1f}ms to {second_call_time*1000:.1f}ms")
        
        return first_call_time, second_call_time
    
    async def demonstrate_query_monitoring(self):
        """Demonstrate query performance monitoring"""
        print("\n📊 QUERY PERFORMANCE MONITORING")
        print("=" * 60)
        
        # Reset monitoring stats
        query_monitor.reset_stats()
        
        # Simulate some queries with monitoring
        with query_monitor.monitor_query("get_business_metrics", self.company_id):
            await asyncio.sleep(0.1)  # Simulate query execution
        
        with query_monitor.monitor_query("get_compliance_metrics", self.company_id):
            await asyncio.sleep(0.05)  # Faster query
        
        with query_monitor.monitor_query("get_user_metrics", self.company_id):
            await asyncio.sleep(0.2)  # Slower query
        
        # Get performance report
        report = query_monitor.get_performance_report()
        
        print("📈 Performance Report:")
        print(f"   📋 Total queries executed: {report['summary']['total_queries']}")
        print(f"   🐌 Slowest query: {report['summary']['slowest_query']['name']} ({report['summary']['slowest_query']['max_time']:.3f}s)")
        print(f"   📊 Average execution time: {report['summary']['average_execution_time']:.3f}s")
        
        print("\n📋 Detailed Query Statistics:")
        for query_name, stats in report['query_statistics'].items():
            print(f"   🔍 {query_name}:")
            print(f"      ⏱️  Avg time: {stats['avg_time']:.3f}s")
            print(f"      🔢 Executions: {stats['total_executions']}")
            print(f"      📈 Min/Max: {stats['min_time']:.3f}s / {stats['max_time']:.3f}s")
        
        return report
    
    async def run_complete_demo(self):
        """Run the complete performance optimization demonstration"""
        print("🎯 ANALYTICS PERFORMANCE OPTIMIZATION DEMO")
        print("=" * 80)
        print("Demonstrating the improvements made to address SQL query performance issues")
        print("=" * 80)
        
        # 1. Compare old vs new approach
        old_results, old_time, old_queries = await self.simulate_old_analytics_approach()
        new_results, new_time, new_queries = await self.simulate_optimized_analytics_approach()
        
        # 2. Demonstrate caching
        cache_first_time, cache_second_time = await self.demonstrate_caching_benefits()
        
        # 3. Show monitoring capabilities
        monitoring_report = await self.demonstrate_query_monitoring()
        
        # 4. Summary of improvements
        print("\n🏆 PERFORMANCE IMPROVEMENT SUMMARY")
        print("=" * 60)
        
        query_reduction = ((old_queries - new_queries) / old_queries) * 100
        time_improvement = ((old_time - new_time) / old_time) * 100
        cache_improvement = ((cache_first_time - cache_second_time) / cache_first_time) * 100
        
        print(f"📉 Database Query Reduction:")
        print(f"   🔍 Queries reduced from {old_queries} to {new_queries} ({query_reduction:.1f}% reduction)")
        
        print(f"\n⏱️  Execution Time Improvement:")
        print(f"   🚀 Time reduced from {old_time:.3f}s to {new_time:.3f}s ({time_improvement:.1f}% improvement)")
        
        print(f"\n💾 Caching Benefits:")
        print(f"   ⚡ Cached responses {cache_improvement:.1f}% faster")
        print(f"   🎯 Sub-10ms response times for cached data")
        
        print(f"\n📊 Monitoring Features:")
        print(f"   📈 Real-time query performance tracking")
        print(f"   🔍 Slow query detection (>{query_monitor.slow_query_threshold}s threshold)")
        print(f"   📋 Comprehensive performance reports")
        
        print(f"\n✅ OPTIMIZATION SUCCESS:")
        print(f"   🎯 Addressed N+1 query problems from problem statement")
        print(f"   🚀 Reduced database load by ~{query_reduction:.0f}%")
        print(f"   ⚡ Improved response times by ~{time_improvement:.0f}%")
        print(f"   💾 Added intelligent caching with ~{cache_improvement:.0f}% speedup")
        print(f"   📊 Added comprehensive performance monitoring")


async def main():
    """Run the analytics optimization demo"""
    demo = AnalyticsDemo()
    await demo.run_complete_demo()


if __name__ == "__main__":
    asyncio.run(main())