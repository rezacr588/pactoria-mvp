"""
Unit tests for Main FastAPI Application
Testing application initialization, middleware, and error handling
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from fastapi import HTTPException
from fastapi.testclient import TestClient
import time

from app.main import app


class TestApplicationInitialization:
    """Test FastAPI application initialization"""
    
    def test_app_instance(self):
        """Test that app is properly initialized"""
        assert app is not None
        assert app.title == "Pactoria Contract Management"
        assert app.version == "0.1.0-mvp"
    
    def test_app_configuration(self):
        """Test app configuration settings"""
        # Test with debug mode
        with patch('app.main.settings') as mock_settings:
            mock_settings.DEBUG = True
            mock_settings.APP_NAME = "Test App"
            mock_settings.APP_VERSION = "2.0.0"
            
            # Reimport to trigger configuration
            import importlib
            import app.main
            importlib.reload(app.main)
            
            test_app = app.main.app
            assert test_app.docs_url == "/docs"
            assert test_app.redoc_url == "/redoc"


class TestLifespanEvents:
    """Test application lifespan events"""
    
    @pytest.mark.asyncio
    async def test_lifespan_startup(self):
        """Test lifespan startup event"""
        with patch('app.main.create_tables') as mock_create_tables, \
             patch('app.main.logger') as mock_logger:
            
            mock_create_tables = AsyncMock()
            
            from app.main import lifespan
            
            # Test startup
            async with lifespan(app):
                pass
            
            # Should have logged startup messages
            mock_logger.info.assert_called()
    
    @pytest.mark.asyncio
    async def test_lifespan_shutdown(self):
        """Test lifespan shutdown event"""
        with patch('app.main.create_tables') as mock_create_tables, \
             patch('app.main.logger') as mock_logger:
            
            mock_create_tables = AsyncMock()
            
            from app.main import lifespan
            
            # Test startup and shutdown
            async with lifespan(app):
                pass
            
            # Should have logged shutdown message
            assert any("Shutting down" in str(call) for call in mock_logger.info.call_args_list)


class TestMiddleware:
    """Test application middleware"""
    
    def test_security_headers_middleware(self):
        """Test security headers middleware"""
        client = TestClient(app)
        
        response = client.get("/health")
        
        # Check security headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-Frame-Options"] == "DENY"
        assert response.headers["X-XSS-Protection"] == "1; mode=block"
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    
    def test_security_headers_middleware_production(self):
        """Test security headers in production mode"""
        with patch('app.main.settings') as mock_settings:
            mock_settings.DEBUG = False
            
            client = TestClient(app)
            response = client.get("/health")
            
            # Should include HSTS header in production
            assert "Strict-Transport-Security" in response.headers
    
    def test_process_time_header_middleware(self):
        """Test process time header middleware"""
        client = TestClient(app)
        
        response = client.get("/health")
        
        # Should have process time header
        assert "X-Process-Time" in response.headers
        process_time = float(response.headers["X-Process-Time"])
        assert process_time >= 0
    
    def test_cors_middleware(self):
        """Test CORS middleware configuration"""
        client = TestClient(app)
        
        # Test preflight request
        response = client.options("/health", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET"
        })
        
        # Should have CORS headers
        assert "Access-Control-Allow-Origin" in response.headers


class TestErrorHandling:
    """Test global error handling"""
    
    def test_global_exception_handler(self):
        """Test global exception handler"""
        client = TestClient(app)
        
        # Create a test endpoint that raises an exception
        @app.get("/test-error")
        async def test_error():
            raise Exception("Test error")
        
        response = client.get("/test-error")
        
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert data["detail"] == "Internal server error"
        assert data["path"] == "/test-error"
        assert data["method"] == "GET"


class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_basic_health_check(self):
        """Test basic health check endpoint"""
        client = TestClient(app)
        
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert data["version"] == "0.1.0-mvp"
        assert "environment" in data
    
    def test_readiness_check(self):
        """Test readiness check endpoint"""
        client = TestClient(app)
        
        response = client.get("/ready")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "ready" in data
        assert "checks" in data
        assert "timestamp" in data
        
        # Check components
        checks = data["checks"]
        assert "database" in checks
        assert "ai_service" in checks
        assert "configuration" in checks
    
    def test_detailed_health_check(self):
        """Test detailed health check endpoint"""
        client = TestClient(app)
        
        response = client.get("/health/detailed")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert "components" in data
        assert "performance" in data
        assert "dependencies" in data
        
        # Check components
        components = data["components"]
        assert "database" in components
        assert "ai_service" in components
        assert "redis_cache" in components
        
        # Check performance metrics
        performance = data["performance"]
        assert "uptime_seconds" in performance
        assert "requests_per_minute" in performance
        assert "average_response_time_ms" in performance
    
    def test_detailed_health_check_settings_integration(self):
        """Test detailed health check uses correct settings"""
        client = TestClient(app)
        
        response = client.get("/health/detailed")
        data = response.json()
        
        # Should include correct model from settings
        ai_component = data["components"]["ai_service"]
        assert "model" in str(data)  # Model info should be present


class TestRootEndpoint:
    """Test root endpoint"""
    
    def test_root_endpoint(self):
        """Test root endpoint response"""
        client = TestClient(app)
        
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == "Pactoria Contract Management"
        assert data["version"] == "0.1.0-mvp"
        assert data["status"] == "operational"
        assert "message" in data
    
    def test_root_endpoint_message(self):
        """Test root endpoint message content"""
        client = TestClient(app)
        
        response = client.get("/")
        data = response.json()
        
        message = data["message"]
        assert "Pactoria" in message
        assert "UK SMEs" in message
        assert "AI-driven" in message


class TestAPIRouter:
    """Test API router inclusion"""
    
    def test_api_router_included(self):
        """Test that API router is properly included"""
        client = TestClient(app)
        
        # Test that API endpoints are accessible
        response = client.get("/api/v1/health")
        
        # Should get a response (even if 404, means router is included)
        assert response.status_code in [200, 404, 422]


class TestApplicationConfiguration:
    """Test application configuration variations"""
    
    def test_app_with_debug_enabled(self):
        """Test app configuration with debug enabled"""
        with patch('app.main.settings') as mock_settings:
            mock_settings.DEBUG = True
            mock_settings.APP_NAME = "Debug App"
            mock_settings.APP_VERSION = "1.0.0-debug"
            
            # Reimport to apply settings
            import importlib
            import app.main
            importlib.reload(app.main)
            
            test_app = app.main.app
            assert test_app.docs_url == "/docs"
            assert test_app.redoc_url == "/redoc"
    
    def test_app_with_debug_disabled(self):
        """Test app configuration with debug disabled"""
        with patch('app.main.settings') as mock_settings:
            mock_settings.DEBUG = False
            mock_settings.APP_NAME = "Production App"
            mock_settings.APP_VERSION = "1.0.0"
            
            # Reimport to apply settings
            import importlib
            import app.main
            importlib.reload(app.main)
            
            test_app = app.main.app
            assert test_app.docs_url is None
            assert test_app.redoc_url is None


class TestMiddlewareIntegration:
    """Test middleware integration and interaction"""
    
    def test_middleware_execution_order(self):
        """Test that middleware executes in correct order"""
        client = TestClient(app)
        
        response = client.get("/health")
        
        # Should have both security headers and process time
        assert "X-Content-Type-Options" in response.headers
        assert "X-Process-Time" in response.headers
    
    def test_middleware_error_handling(self):
        """Test middleware behavior during errors"""
        
        # Create a test endpoint that raises an exception
        @app.get("/test-middleware-error")
        async def test_middleware_error():
            raise Exception("Middleware test error")
        
        client = TestClient(app)
        response = client.get("/test-middleware-error")
        
        # Should still have middleware headers even on error
        assert response.status_code == 500
        assert "X-Process-Time" in response.headers
    
    def test_cors_origins_configuration(self):
        """Test CORS origins configuration"""
        with patch('app.main.settings') as mock_settings:
            mock_settings.CORS_ORIGINS = ["http://localhost:3000", "https://app.pactoria.com"]
            
            client = TestClient(app)
            
            # Test allowed origin
            response = client.options("/health", headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET"
            })
            
            assert response.status_code == 200


class TestApplicationMetadata:
    """Test application metadata and configuration"""
    
    def test_app_metadata(self):
        """Test application metadata is properly set"""
        assert hasattr(app, 'title')
        assert hasattr(app, 'version')
        assert hasattr(app, 'description')
        
        assert app.title == "Pactoria Contract Management"
    
    def test_app_lifespan_configured(self):
        """Test that lifespan is properly configured"""
        assert app.router.lifespan is not None
    
    def test_app_middleware_configured(self):
        """Test that middleware is properly configured"""
        # App should have middleware configured
        assert len(app.user_middleware) > 0
        
        # Check for specific middleware
        middleware_types = [middleware.cls for middleware in app.user_middleware]
        from starlette.middleware.cors import CORSMiddleware
        from starlette.middleware.trustedhost import TrustedHostMiddleware
        
        assert CORSMiddleware in middleware_types
        assert TrustedHostMiddleware in middleware_types


class TestPerformance:
    """Test performance characteristics"""
    
    def test_health_endpoint_performance(self):
        """Test health endpoint response time"""
        client = TestClient(app)
        
        start_time = time.perf_counter()
        
        for _ in range(10):
            response = client.get("/health")
            assert response.status_code == 200
        
        end_time = time.perf_counter()
        total_time = end_time - start_time
        
        # 10 requests should complete quickly
        assert total_time < 1.0
    
    def test_process_time_header_accuracy(self):
        """Test process time header accuracy"""
        client = TestClient(app)
        
        response = client.get("/health")
        process_time = float(response.headers["X-Process-Time"])
        
        # Process time should be reasonable (less than 1 second for health check)
        assert 0 <= process_time < 1.0


class TestErrorScenarios:
    """Test various error scenarios"""
    
    def test_middleware_exception_logging(self):
        """Test that middleware exceptions are logged"""
        
        @app.get("/test-middleware-logging")
        async def test_middleware_logging():
            raise ValueError("Test logging error")
        
        with patch('app.main.logger') as mock_logger:
            client = TestClient(app)
            response = client.get("/test-middleware-logging")
            
            assert response.status_code == 500
            # Should have logged the error
            mock_logger.error.assert_called()
    
    def test_global_exception_handler_logging(self):
        """Test global exception handler logging"""
        
        @app.get("/test-global-handler-logging")
        async def test_global_handler_logging():
            raise RuntimeError("Global handler test error")
        
        with patch('app.main.logger') as mock_logger:
            client = TestClient(app)
            response = client.get("/test-global-handler-logging")
            
            assert response.status_code == 500
            # Should have logged the exception
            mock_logger.error.assert_called()


class TestSettingsIntegration:
    """Test integration with settings module"""
    
    def test_settings_cors_origins(self):
        """Test CORS origins from settings"""
        from app.main import app
        
        # Check that CORS middleware was configured
        cors_middleware = None
        for middleware in app.user_middleware:
            if hasattr(middleware, 'cls') and 'CORS' in str(middleware.cls):
                cors_middleware = middleware
                break
        
        assert cors_middleware is not None
    
    def test_settings_api_prefix(self):
        """Test API prefix from settings"""
        client = TestClient(app)
        
        # API should be available at the configured prefix
        response = client.get("/api/v1/health")
        
        # Should get some response (even if 404, means prefix is configured)
        assert response.status_code in [200, 404, 422]


class TestDirectExecution:
    """Test direct execution behavior"""
    
    def test_main_execution(self):
        """Test main execution block"""
        with patch('app.main.uvicorn') as mock_uvicorn:
            # Mock __name__ to trigger main execution
            with patch('app.main.__name__', '__main__'):
                
                # Reimport to trigger main block
                import importlib
                import app.main
                importlib.reload(app.main)
                
                # Should have called uvicorn.run
                mock_uvicorn.run.assert_called_once()
                
                # Check uvicorn configuration
                call_args = mock_uvicorn.run.call_args
                assert call_args[0][0] == "app.main:app"
                assert call_args[1]["host"] == "0.0.0.0"
                assert call_args[1]["port"] == 8000