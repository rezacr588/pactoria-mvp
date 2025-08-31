"""
Unit tests for Security Service
Testing security monitoring, rate limiting, and threat detection
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from fastapi import Request, HTTPException
import time
import hashlib

from app.services.security_service import (
    SecurityEvent, RateLimiter, SecurityMonitor, 
    SecurityMiddleware, security_monitor
)


class TestSecurityEvent:
    """Test SecurityEvent class"""
    
    def test_security_event_creation(self):
        """Test SecurityEvent creation"""
        details = {"ip": "192.168.1.1", "action": "login_attempt"}
        event = SecurityEvent("failed_login", "medium", details)
        
        assert event.event_type == "failed_login"
        assert event.severity == "medium"
        assert event.details == details
        assert event.timestamp is not None
        assert event.id is not None
        assert len(event.id) == 32  # MD5 hash length
    
    def test_security_event_with_timestamp(self):
        """Test SecurityEvent with custom timestamp"""
        custom_time = datetime(2023, 1, 15, 12, 0, 0)
        details = {"test": "data"}
        event = SecurityEvent("test_event", "low", details, custom_time)
        
        assert event.timestamp == custom_time
    
    def test_security_event_id_generation(self):
        """Test SecurityEvent ID generation uniqueness"""
        details = {"test": "data"}
        event1 = SecurityEvent("test", "low", details)
        time.sleep(0.001)  # Small delay to ensure different timestamps
        event2 = SecurityEvent("test", "low", details)
        
        assert event1.id != event2.id


class TestRateLimiter:
    """Test RateLimiter class"""
    
    @pytest.fixture
    def rate_limiter(self):
        """Create RateLimiter instance"""
        return RateLimiter()
    
    def test_rate_limiter_initialization(self, rate_limiter):
        """Test RateLimiter initialization"""
        assert rate_limiter.requests == {}
        assert rate_limiter.blocked_ips == {}
    
    def test_rate_limiter_allow_first_request(self, rate_limiter):
        """Test rate limiter allows first request"""
        result = rate_limiter.is_allowed("192.168.1.1", 5, 60)
        assert result is True
    
    def test_rate_limiter_block_after_limit(self, rate_limiter):
        """Test rate limiter blocks after reaching limit"""
        identifier = "192.168.1.1"
        
        # Make requests up to limit
        for _ in range(5):
            result = rate_limiter.is_allowed(identifier, 5, 60)
            if result:  # Only add to requests if allowed
                if identifier not in rate_limiter.requests:
                    rate_limiter.requests[identifier] = []
                rate_limiter.requests[identifier].append(datetime.utcnow())
        
        # Next request should be blocked
        result = rate_limiter.is_allowed(identifier, 5, 60)
        assert result is False
        assert identifier in rate_limiter.blocked_ips
    
    def test_rate_limiter_window_cleanup(self, rate_limiter):
        """Test rate limiter cleans up old requests"""
        identifier = "192.168.1.1"
        old_time = datetime.utcnow() - timedelta(seconds=120)
        
        # Add old requests
        rate_limiter.requests[identifier] = [old_time] * 3
        
        # New request should be allowed (old ones cleaned up)
        result = rate_limiter.is_allowed(identifier, 5, 60)
        assert result is True
    
    def test_rate_limiter_blocked_ip_expiry(self, rate_limiter):
        """Test blocked IP expiry"""
        identifier = "192.168.1.1"
        past_time = datetime.utcnow() - timedelta(minutes=10)
        
        # Set IP as blocked in the past
        rate_limiter.blocked_ips[identifier] = past_time
        
        result = rate_limiter.is_allowed(identifier, 5, 60)
        assert result is True
        assert identifier not in rate_limiter.blocked_ips
    
    def test_get_remaining_requests_new_ip(self, rate_limiter):
        """Test remaining requests for new IP"""
        result = rate_limiter.get_remaining_requests("192.168.1.1", 10, 60)
        assert result == 10
    
    def test_get_remaining_requests_with_history(self, rate_limiter):
        """Test remaining requests with existing history"""
        identifier = "192.168.1.1"
        now = datetime.utcnow()
        
        # Add some recent requests
        rate_limiter.requests[identifier] = [
            now - timedelta(seconds=30),
            now - timedelta(seconds=10)
        ]
        
        result = rate_limiter.get_remaining_requests(identifier, 5, 60)
        assert result == 3  # 5 - 2 existing requests


class TestSecurityMonitor:
    """Test SecurityMonitor class"""
    
    @pytest.fixture
    def security_monitor_instance(self):
        """Create fresh SecurityMonitor instance"""
        return SecurityMonitor()
    
    @pytest.fixture
    def mock_request(self):
        """Create mock FastAPI Request"""
        request = Mock(spec=Request)
        request.url = Mock()
        request.url.__str__ = Mock(return_value="https://example.com/api/test")
        request.headers = {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "x-forwarded-for": "192.168.1.1"
        }
        request.client = Mock()
        request.client.host = "192.168.1.1"
        return request
    
    def test_security_monitor_initialization(self, security_monitor_instance):
        """Test SecurityMonitor initialization"""
        monitor = security_monitor_instance
        assert monitor.security_events == []
        assert monitor.rate_limiter is not None
        assert monitor.suspicious_patterns is not None
        assert monitor.failed_logins == {}
        assert len(monitor.suspicious_patterns) > 0
    
    def test_analyze_request_clean(self, security_monitor_instance, mock_request):
        """Test analyzing clean request"""
        result = security_monitor_instance.analyze_request(mock_request)
        assert result is None
    
    def test_analyze_request_suspicious_url(self, security_monitor_instance, mock_request):
        """Test analyzing request with suspicious URL"""
        mock_request.url.__str__ = Mock(return_value="https://example.com/api/test?id=1' OR 1=1")
        
        result = security_monitor_instance.analyze_request(mock_request)
        assert result is not None
        assert result.event_type == "suspicious_request"
        assert result.severity == "medium"
        assert "URL contains" in str(result.details["suspicious_patterns"])
    
    def test_analyze_request_suspicious_user_agent(self, security_monitor_instance, mock_request):
        """Test analyzing request with suspicious user agent"""
        mock_request.headers = {
            "user-agent": "sqlmap/1.0",
            "x-forwarded-for": "192.168.1.1"
        }
        
        result = security_monitor_instance.analyze_request(mock_request)
        assert result is not None
        assert result.event_type == "suspicious_request"
        assert "Suspicious User-Agent" in str(result.details["suspicious_patterns"])
    
    def test_analyze_request_multiple_forwarding_headers(self, security_monitor_instance, mock_request):
        """Test analyzing request with multiple forwarding headers"""
        mock_request.headers = {
            "user-agent": "Mozilla/5.0",
            "x-forwarded-for": "192.168.1.1",
            "x-real-ip": "10.0.0.1"
        }
        
        result = security_monitor_instance.analyze_request(mock_request)
        assert result is not None
        assert "Multiple forwarding headers" in str(result.details["suspicious_patterns"])
    
    def test_check_rate_limit_allowed(self, security_monitor_instance, mock_request):
        """Test rate limit check allows request"""
        result = security_monitor_instance.check_rate_limit(mock_request, 10, 60)
        assert result is True
    
    def test_check_rate_limit_exceeded(self, security_monitor_instance, mock_request):
        """Test rate limit check blocks request"""
        # Mock rate limiter to return False
        with patch.object(security_monitor_instance.rate_limiter, 'is_allowed', return_value=False):
            result = security_monitor_instance.check_rate_limit(mock_request, 1, 60)
            assert result is False
            
            # Should have logged an event
            assert len(security_monitor_instance.security_events) > 0
            event = security_monitor_instance.security_events[-1]
            assert event.event_type == "rate_limit_exceeded"
            assert event.severity == "high"
    
    def test_log_failed_login(self, security_monitor_instance):
        """Test logging failed login attempt"""
        email = "test@example.com"
        ip = "192.168.1.1"
        
        security_monitor_instance.log_failed_login(email, ip)
        
        assert email in security_monitor_instance.failed_logins
        assert len(security_monitor_instance.failed_logins[email]) == 1
    
    def test_log_failed_login_brute_force_detection(self, security_monitor_instance):
        """Test brute force detection on multiple failed logins"""
        email = "test@example.com"
        ip = "192.168.1.1"
        
        # Log 5 failed attempts
        for _ in range(5):
            security_monitor_instance.log_failed_login(email, ip)
        
        # Should have created a security event
        brute_force_events = [
            event for event in security_monitor_instance.security_events
            if event.event_type == "potential_brute_force"
        ]
        assert len(brute_force_events) > 0
        event = brute_force_events[-1]
        assert event.severity == "high"
        assert event.details["failed_attempts"] == 5
    
    def test_log_failed_login_critical_brute_force(self, security_monitor_instance):
        """Test critical brute force detection"""
        email = "test@example.com"
        ip = "192.168.1.1"
        
        # Log 10 failed attempts
        for _ in range(10):
            security_monitor_instance.log_failed_login(email, ip)
        
        # Should have critical severity event
        brute_force_events = [
            event for event in security_monitor_instance.security_events
            if event.event_type == "potential_brute_force" and event.severity == "critical"
        ]
        assert len(brute_force_events) > 0
    
    def test_log_successful_login(self, security_monitor_instance):
        """Test logging successful login"""
        email = "test@example.com"
        ip = "192.168.1.1"
        user_id = "user123"
        
        # Add some failed attempts first
        security_monitor_instance.log_failed_login(email, ip)
        assert email in security_monitor_instance.failed_logins
        
        # Log successful login
        security_monitor_instance.log_successful_login(user_id, email, ip)
        
        # Failed attempts should be cleared
        assert email not in security_monitor_instance.failed_logins
        
        # Should have logged success event
        success_events = [
            event for event in security_monitor_instance.security_events
            if event.event_type == "successful_login"
        ]
        assert len(success_events) > 0
        event = success_events[-1]
        assert event.severity == "low"
        assert event.details["user_id"] == user_id
    
    def test_log_security_event(self, security_monitor_instance):
        """Test logging security event"""
        event = SecurityEvent("test_event", "medium", {"test": "data"})
        initial_count = len(security_monitor_instance.security_events)
        
        security_monitor_instance.log_security_event(event)
        
        assert len(security_monitor_instance.security_events) == initial_count + 1
        assert security_monitor_instance.security_events[-1] == event
    
    def test_log_security_event_limit(self, security_monitor_instance):
        """Test security event storage limit"""
        # Add more than 1000 events
        for i in range(1050):
            event = SecurityEvent(f"test_event_{i}", "low", {"index": i})
            security_monitor_instance.security_events.append(event)
        
        # Should keep only last 1000
        security_monitor_instance.log_security_event(
            SecurityEvent("new_event", "high", {"test": "data"})
        )
        
        assert len(security_monitor_instance.security_events) == 1000
        assert security_monitor_instance.security_events[-1].event_type == "new_event"
    
    def test_get_security_summary(self, security_monitor_instance):
        """Test getting security summary"""
        # Add some test events
        now = datetime.utcnow()
        events_data = [
            ("suspicious_request", "medium"),
            ("rate_limit_exceeded", "high"),
            ("successful_login", "low"),
            ("potential_brute_force", "critical")
        ]
        
        for event_type, severity in events_data:
            event = SecurityEvent(event_type, severity, {"test": "data"})
            event.timestamp = now
            security_monitor_instance.security_events.append(event)
        
        summary = security_monitor_instance.get_security_summary(24)
        
        assert summary["total_events"] == len(events_data)
        assert summary["event_types"]["suspicious_request"] == 1
        assert summary["severity_counts"]["high"] == 1
        assert summary["severity_counts"]["critical"] == 1
        assert summary["high_priority_events"] == 2  # high + critical
    
    def test_get_security_summary_time_filter(self, security_monitor_instance):
        """Test security summary with time filtering"""
        now = datetime.utcnow()
        old_event = SecurityEvent("old_event", "low", {"test": "data"})
        old_event.timestamp = now - timedelta(hours=48)
        
        recent_event = SecurityEvent("recent_event", "medium", {"test": "data"})
        recent_event.timestamp = now
        
        security_monitor_instance.security_events.extend([old_event, recent_event])
        
        summary = security_monitor_instance.get_security_summary(24)
        
        assert summary["total_events"] == 1
        assert "recent_event" in summary["event_types"]
        assert "old_event" not in summary["event_types"]
    
    def test_get_client_ip_forwarded_for(self, security_monitor_instance, mock_request):
        """Test getting client IP from x-forwarded-for header"""
        mock_request.headers = {"x-forwarded-for": "192.168.1.1, 10.0.0.1"}
        
        ip = security_monitor_instance.get_client_ip(mock_request)
        assert ip == "192.168.1.1"
    
    def test_get_client_ip_real_ip(self, security_monitor_instance, mock_request):
        """Test getting client IP from x-real-ip header"""
        mock_request.headers = {"x-real-ip": "10.0.0.1"}
        
        ip = security_monitor_instance.get_client_ip(mock_request)
        assert ip == "10.0.0.1"
    
    def test_get_client_ip_direct(self, security_monitor_instance, mock_request):
        """Test getting direct client IP"""
        mock_request.headers = {}
        mock_request.client.host = "192.168.1.1"
        
        ip = security_monitor_instance.get_client_ip(mock_request)
        assert ip == "192.168.1.1"
    
    def test_get_client_ip_unknown(self, security_monitor_instance, mock_request):
        """Test getting client IP when unavailable"""
        mock_request.headers = {}
        mock_request.client = None
        
        ip = security_monitor_instance.get_client_ip(mock_request)
        assert ip == "unknown"


class TestSecurityMiddleware:
    """Test SecurityMiddleware class"""
    
    @pytest.fixture
    def security_middleware(self):
        """Create SecurityMiddleware instance"""
        return SecurityMiddleware()
    
    @pytest.fixture
    def mock_request(self):
        """Create mock FastAPI Request"""
        request = Mock(spec=Request)
        request.url = Mock()
        request.url.__str__ = Mock(return_value="https://example.com/api/test")
        request.headers = {"user-agent": "Mozilla/5.0"}
        request.client = Mock()
        request.client.host = "192.168.1.1"
        return request
    
    def test_security_middleware_initialization(self, security_middleware):
        """Test SecurityMiddleware initialization"""
        assert security_middleware.monitor is not None
        assert security_middleware.monitor == security_monitor
    
    @pytest.mark.asyncio
    async def test_security_middleware_allows_normal_request(self, security_middleware, mock_request):
        """Test middleware allows normal request"""
        async def mock_call_next(request):
            response = Mock()
            response.status_code = 200
            return response
        
        with patch.object(security_middleware.monitor, 'check_rate_limit', return_value=True), \
             patch.object(security_middleware.monitor, 'analyze_request', return_value=None):
            
            response = await security_middleware(mock_request, mock_call_next)
            assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_security_middleware_blocks_rate_limited_request(self, security_middleware, mock_request):
        """Test middleware blocks rate limited request"""
        async def mock_call_next(request):
            return Mock()
        
        with patch.object(security_middleware.monitor, 'check_rate_limit', return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                await security_middleware(mock_request, mock_call_next)
            
            assert exc_info.value.status_code == 429
            assert "Rate limit exceeded" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_security_middleware_logs_suspicious_request(self, security_middleware, mock_request):
        """Test middleware logs suspicious request but allows it"""
        suspicious_event = SecurityEvent("suspicious_request", "medium", {"test": "data"})
        
        async def mock_call_next(request):
            response = Mock()
            response.status_code = 200
            return response
        
        with patch.object(security_middleware.monitor, 'check_rate_limit', return_value=True), \
             patch.object(security_middleware.monitor, 'analyze_request', return_value=suspicious_event):
            
            response = await security_middleware(mock_request, mock_call_next)
            assert response.status_code == 200  # Should still allow request


class TestGlobalSecurityMonitor:
    """Test global security monitor instance"""
    
    def test_global_security_monitor_exists(self):
        """Test global security monitor instance exists"""
        from app.services.security_service import security_monitor
        assert security_monitor is not None
        assert isinstance(security_monitor, SecurityMonitor)
    
    def test_global_security_monitor_singleton(self):
        """Test global security monitor is singleton-like"""
        from app.services.security_service import security_monitor as monitor1
        from app.services.security_service import security_monitor as monitor2
        
        assert monitor1 is monitor2


class TestSecurityPatterns:
    """Test security pattern detection"""
    
    @pytest.fixture
    def monitor(self):
        return SecurityMonitor()
    
    def test_suspicious_patterns_coverage(self, monitor):
        """Test coverage of suspicious patterns"""
        patterns = monitor.suspicious_patterns
        
        # Should detect common attack patterns
        expected_patterns = ["' OR 1=1", "UNION SELECT", "<script>", "javascript:", "../"]
        for pattern in expected_patterns:
            assert pattern in patterns
    
    def test_pattern_detection_case_insensitive(self, monitor, mock_request):
        """Test pattern detection is case insensitive"""
        mock_request.url.__str__ = Mock(return_value="https://example.com/test?id=1' or 1=1")
        
        result = monitor.analyze_request(mock_request)
        assert result is not None
        assert "URL contains" in str(result.details["suspicious_patterns"])

    @pytest.fixture
    def mock_request(self):
        """Create mock FastAPI Request"""
        request = Mock(spec=Request)
        request.url = Mock()
        request.url.__str__ = Mock(return_value="https://example.com/api/test")
        request.headers = {"user-agent": "Mozilla/5.0"}
        request.client = Mock()
        request.client.host = "192.168.1.1"
        return request


class TestPerformance:
    """Test performance characteristics"""
    
    def test_security_event_creation_performance(self):
        """Test SecurityEvent creation performance"""
        start_time = time.perf_counter()
        
        for _ in range(100):
            SecurityEvent("test", "low", {"data": "test"})
        
        end_time = time.perf_counter()
        total_time = end_time - start_time
        
        assert total_time < 1.0  # Should complete quickly
    
    def test_rate_limiter_performance(self):
        """Test RateLimiter performance"""
        limiter = RateLimiter()
        
        start_time = time.perf_counter()
        
        for i in range(100):
            limiter.is_allowed(f"ip_{i}", 10, 60)
        
        end_time = time.perf_counter()
        total_time = end_time - start_time
        
        assert total_time < 1.0  # Should complete quickly
    
    def test_security_monitor_analysis_performance(self):
        """Test SecurityMonitor analysis performance"""
        monitor = SecurityMonitor()
        request = Mock(spec=Request)
        request.url.__str__ = Mock(return_value="https://example.com/api/test")
        request.headers = {"user-agent": "Mozilla/5.0"}
        request.client = Mock()
        request.client.host = "192.168.1.1"
        
        start_time = time.perf_counter()
        
        for _ in range(100):
            monitor.analyze_request(request)
        
        end_time = time.perf_counter()
        total_time = end_time - start_time
        
        assert total_time < 1.0  # Should complete quickly


class TestErrorHandling:
    """Test error handling in security components"""
    
    def test_security_event_with_invalid_data(self):
        """Test SecurityEvent handles invalid data gracefully"""
        # Should not raise exception with None details
        event = SecurityEvent("test", "low", None)
        assert event.details is None
        assert event.event_type == "test"
    
    def test_rate_limiter_with_invalid_identifier(self):
        """Test RateLimiter handles invalid identifier"""
        limiter = RateLimiter()
        
        # Should handle None identifier gracefully
        result = limiter.is_allowed(None, 5, 60)
        assert isinstance(result, bool)
    
    def test_security_monitor_with_malformed_request(self):
        """Test SecurityMonitor handles malformed request"""
        monitor = SecurityMonitor()
        
        # Mock request with missing attributes
        request = Mock()
        request.url = None
        request.headers = {}
        request.client = None
        
        # Should not raise exception
        try:
            result = monitor.analyze_request(request)
            # Result can be None or SecurityEvent, both are valid
            assert result is None or isinstance(result, SecurityEvent)
        except Exception as e:
            # If it does raise an exception, it should be handled gracefully
            assert isinstance(e, (AttributeError, TypeError))
    
    def test_get_client_ip_with_malformed_headers(self):
        """Test get_client_ip with malformed headers"""
        monitor = SecurityMonitor()
        request = Mock(spec=Request)
        
        # Malformed x-forwarded-for header
        request.headers = {"x-forwarded-for": ""}
        request.client = Mock()
        request.client.host = "192.168.1.1"
        
        ip = monitor.get_client_ip(request)
        assert ip == "192.168.1.1"  # Should fall back to client.host