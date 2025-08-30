"""
Integration tests for System Monitoring and Health endpoints
Testing MVP requirements for system uptime, performance monitoring, and observability
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock
import time
from datetime import datetime, timedelta

from app.main import app


class TestSystemMonitoring:
    """Integration tests for system monitoring endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def admin_headers(self):
        """Mock admin authentication headers"""
        return {"Authorization": "Bearer mock_admin_token"}
    
    def test_health_check_endpoint(self, client):
        """Test basic system health check"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Basic health check structure
        assert "status" in data
        assert "timestamp" in data
        assert "version" in data
        assert "environment" in data
        
        # MVP requirement: System should be healthy
        assert data["status"] in ["healthy", "ok"]
    
    def test_detailed_health_check(self, client):
        """Test detailed health check with all components"""
        response = client.get("/health/detailed")
        
        assert response.status_code == 200
        data = response.json()
        
        # Detailed health check structure
        assert "status" in data
        assert "components" in data
        assert "performance" in data
        assert "dependencies" in data
        
        # Verify critical components
        components = data["components"]
        assert "database" in components
        assert "ai_service" in components
        assert "redis_cache" in components
        
        # MVP requirement: All critical components healthy
        for component_name, component_data in components.items():
            assert component_data["status"] in ["healthy", "ok"]
    
    def test_system_uptime_metrics(self, client, admin_headers):
        """Test MVP requirement: >99.5% system uptime"""
        with patch('app.api.v1.endpoints.monitoring.get_current_user') as mock_user:
            mock_user.return_value = {"id": "admin-123", "is_admin": True}
            
            with patch('app.api.v1.endpoints.monitoring.monitoring_service') as mock_monitoring:
                mock_monitoring.get_uptime_metrics = Mock(return_value={
                    "current_uptime_percentage": 99.8,  # Exceeds MVP requirement of 99.5%
                    "uptime_sla": 99.5,
                    "total_downtime_minutes": 14.4,  # In last 30 days
                    "uptime_status": "MEETING_SLA",
                    "availability_zones": {
                        "database": {"uptime": 99.9, "status": "healthy"},
                        "api_server": {"uptime": 99.8, "status": "healthy"},
                        "ai_service": {"uptime": 99.7, "status": "healthy"}
                    },
                    "incident_count": 2,
                    "mean_time_to_recovery_minutes": 7.2
                })
                
                response = client.get(
                    "/api/v1/monitoring/uptime",
                    headers=admin_headers
                )
                
                assert response.status_code == 200
                data = response.json()
                
                # Verify MVP requirement: >99.5% uptime
                assert data["current_uptime_percentage"] >= 99.5
                assert data["uptime_status"] == "MEETING_SLA"
                
                # Verify recovery time
                assert data["mean_time_to_recovery_minutes"] <= 15  # Good recovery time
    
    def test_performance_monitoring(self, client, admin_headers):
        """Test system performance monitoring"""
        with patch('app.api.v1.endpoints.monitoring.get_current_user') as mock_user:
            mock_user.return_value = {"id": "admin-123", "is_admin": True}
            
            response = client.get(
                "/api/v1/monitoring/performance",
                headers=admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Performance metrics structure
            assert "api_response_times" in data
            assert "contract_generation_times" in data
            assert "system_resources" in data
            assert "throughput_metrics" in data
            
            # MVP performance requirements
            api_times = data["api_response_times"]
            if "average_response_time_ms" in api_times:
                assert api_times["average_response_time_ms"] <= 500  # MVP: <500ms
            
            contract_times = data["contract_generation_times"]
            if "average_generation_time_seconds" in contract_times:
                assert contract_times["average_generation_time_seconds"] <= 30  # MVP: <30s
    
    def test_ai_service_health_monitoring(self, client):
        """Test AI service specific health monitoring"""
        response = client.get("/api/v1/ai/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # AI service health structure
        assert "status" in data
        assert "model" in data
        assert "features" in data
        assert "response_time_ms" in data
        
        # Verify AI service is healthy
        assert data["status"] == "healthy"
        assert data["model"] == "openai/gpt-oss-120b"  # Verify correct model
        
        # Verify AI response time
        assert data["response_time_ms"] <= 2000  # AI should respond quickly
    
    def test_database_health_monitoring(self, client, admin_headers):
        """Test database health and connection monitoring"""
        with patch('app.api.v1.endpoints.monitoring.get_current_user') as mock_user:
            mock_user.return_value = {"id": "admin-123", "is_admin": True}
            
            response = client.get(
                "/api/v1/monitoring/database",
                headers=admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Database health structure
            assert "status" in data
            assert "connection_pool" in data
            assert "query_performance" in data
            assert "storage_usage" in data
            
            # Verify database is healthy
            assert data["status"] == "healthy"
            
            # Check connection pool health
            pool_data = data["connection_pool"]
            assert pool_data["active_connections"] >= 0
            assert pool_data["pool_size"] > 0
    
    def test_error_rate_monitoring(self, client, admin_headers):
        """Test system error rate monitoring"""
        with patch('app.api.v1.endpoints.monitoring.get_current_user') as mock_user:
            mock_user.return_value = {"id": "admin-123", "is_admin": True}
            
            with patch('app.api.v1.endpoints.monitoring.monitoring_service') as mock_monitoring:
                mock_monitoring.get_error_metrics = Mock(return_value={
                    "error_rate_percentage": 0.2,  # Low error rate
                    "total_requests": 10000,
                    "total_errors": 20,
                    "error_categories": {
                        "4xx_errors": 15,
                        "5xx_errors": 5,
                        "ai_service_errors": 3,
                        "database_errors": 2
                    },
                    "error_trends": "DECREASING",
                    "top_error_endpoints": [
                        {"endpoint": "/api/v1/ai/analyze-contract", "error_count": 8},
                        {"endpoint": "/api/v1/contracts/generate", "error_count": 5}
                    ]
                })
                
                response = client.get(
                    "/api/v1/monitoring/errors",
                    params={"period": "24h"},
                    headers=admin_headers
                )
                
                assert response.status_code == 200
                data = response.json()
                
                # Verify low error rate (good system health)
                assert data["error_rate_percentage"] <= 1.0  # <1% error rate
                assert data["error_trends"] in ["STABLE", "DECREASING"]
    
    def test_resource_usage_monitoring(self, client, admin_headers):
        """Test system resource usage monitoring"""
        with patch('app.api.v1.endpoints.monitoring.get_current_user') as mock_user:
            mock_user.return_value = {"id": "admin-123", "is_admin": True}
            
            response = client.get(
                "/api/v1/monitoring/resources",
                headers=admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Resource usage structure
            assert "cpu_usage" in data
            assert "memory_usage" in data
            assert "disk_usage" in data
            assert "network_usage" in data
            
            # Verify resources are within acceptable limits
            assert 0 <= data["cpu_usage"]["percentage"] <= 100
            assert 0 <= data["memory_usage"]["percentage"] <= 100
            assert 0 <= data["disk_usage"]["percentage"] <= 100
    
    def test_alert_configuration(self, client, admin_headers):
        """Test system alert configuration and thresholds"""
        with patch('app.api.v1.endpoints.monitoring.get_current_user') as mock_user:
            mock_user.return_value = {"id": "admin-123", "is_admin": True}
            
            response = client.get(
                "/api/v1/monitoring/alerts/config",
                headers=admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Alert configuration structure
            assert "uptime_threshold" in data
            assert "response_time_threshold" in data
            assert "error_rate_threshold" in data
            assert "resource_usage_thresholds" in data
            
            # Verify MVP alert thresholds
            assert data["uptime_threshold"] >= 99.5  # MVP requirement
            assert data["response_time_threshold"] <= 500  # MVP requirement
    
    def test_system_metrics_export(self, client, admin_headers):
        """Test system metrics export for external monitoring"""
        with patch('app.api.v1.endpoints.monitoring.get_current_user') as mock_user:
            mock_user.return_value = {"id": "admin-123", "is_admin": True}
            
            response = client.get(
                "/api/v1/monitoring/metrics/export",
                params={"format": "prometheus"},
                headers=admin_headers
            )
            
            assert response.status_code == 200
            
            # Verify Prometheus format metrics
            metrics_text = response.text
            assert "pactoria_api_requests_total" in metrics_text
            assert "pactoria_contract_generation_duration_seconds" in metrics_text
            assert "pactoria_uptime_percentage" in metrics_text
    
    def test_health_check_response_time(self, client):
        """Test that health check responds quickly"""
        start_time = time.time()
        
        response = client.get("/health")
        
        end_time = time.time()
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        assert response.status_code == 200
        # Health check should be very fast
        assert response_time <= 100, f"Health check took {response_time}ms, should be <100ms"
    
    def test_monitoring_endpoints_authentication(self, client):
        """Test that monitoring endpoints require proper authentication"""
        admin_endpoints = [
            "/api/v1/monitoring/uptime",
            "/api/v1/monitoring/performance",
            "/api/v1/monitoring/database",
            "/api/v1/monitoring/errors",
            "/api/v1/monitoring/resources",
            "/api/v1/monitoring/alerts/config",
            "/api/v1/monitoring/metrics/export"
        ]
        
        for endpoint in admin_endpoints:
            response = client.get(endpoint)
            assert response.status_code in [401, 422]  # Unauthorized
    
    def test_monitoring_with_date_range(self, client, admin_headers):
        """Test monitoring endpoints with date range filtering"""
        with patch('app.api.v1.endpoints.monitoring.get_current_user') as mock_user:
            mock_user.return_value = {"id": "admin-123", "is_admin": True}
            
            start_date = (datetime.now() - timedelta(hours=24)).isoformat()
            end_date = datetime.now().isoformat()
            
            response = client.get(
                "/api/v1/monitoring/performance",
                params={
                    "start_date": start_date,
                    "end_date": end_date
                },
                headers=admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify date range is respected
            assert "period_start" in data or "start_date" in data
            assert "period_end" in data or "end_date" in data
    
    def test_system_readiness_check(self, client):
        """Test system readiness for production deployment"""
        response = client.get("/ready")
        
        assert response.status_code == 200
        data = response.json()
        
        # Readiness check structure
        assert "ready" in data
        assert "checks" in data
        
        # All readiness checks must pass
        assert data["ready"] is True
        
        # Verify critical system components are ready
        checks = data["checks"]
        for check_name, check_result in checks.items():
            assert check_result["status"] == "pass", f"{check_name} readiness check failed"
    
    @pytest.mark.parametrize("component", ["database", "ai_service", "redis_cache", "file_storage"])
    def test_individual_component_health(self, client, admin_headers, component):
        """Test individual component health checks"""
        with patch('app.api.v1.endpoints.monitoring.get_current_user') as mock_user:
            mock_user.return_value = {"id": "admin-123", "is_admin": True}
            
            response = client.get(
                f"/api/v1/monitoring/components/{component}",
                headers=admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Component health structure
            assert "component" in data
            assert "status" in data
            assert "last_check" in data
            
            assert data["component"] == component
            assert data["status"] in ["healthy", "unhealthy", "degraded"]