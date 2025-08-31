"""
Security service for Pactoria MVP
Rate limiting, security monitoring, and threat detection
"""
import time
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import Request, HTTPException, status
import hashlib
import json
import uuid

logger = logging.getLogger(__name__)


class SecurityEvent:
    """Security event data structure"""
    def __init__(self, event_type: str, severity: str, details: Dict, timestamp: datetime = None):
        self.event_type = event_type
        self.severity = severity  # low, medium, high, critical
        self.details = details
        self.timestamp = timestamp or datetime.utcnow()
        # Generate truly unique ID using UUID and timestamp
        unique_data = f"{event_type}{self.timestamp.isoformat()}{uuid.uuid4().hex}"
        self.id = hashlib.md5(unique_data.encode()).hexdigest()


class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self):
        self.requests: Dict[str, List[datetime]] = {}
        self.blocked_ips: Dict[str, datetime] = {}
    
    def is_allowed(self, identifier: str, max_requests: int, window_seconds: int) -> bool:
        """Check if request is allowed under rate limit"""
        now = datetime.utcnow()
        
        # Check if IP is temporarily blocked
        if identifier in self.blocked_ips:
            if now < self.blocked_ips[identifier]:
                return False
            else:
                del self.blocked_ips[identifier]
        
        # Initialize or clean old requests
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Remove old requests outside the window
        window_start = now - timedelta(seconds=window_seconds)
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier] 
            if req_time > window_start
        ]
        
        # Check rate limit
        if len(self.requests[identifier]) >= max_requests:
            # Block IP for 5 minutes on rate limit violation
            self.blocked_ips[identifier] = now + timedelta(minutes=5)
            return False
        
        # Add current request
        self.requests[identifier].append(now)
        
        return True
    
    def get_remaining_requests(self, identifier: str, max_requests: int, window_seconds: int) -> int:
        """Get remaining requests in current window"""
        now = datetime.utcnow()
        
        if identifier not in self.requests:
            return max_requests
        
        window_start = now - timedelta(seconds=window_seconds)
        current_requests = [
            req_time for req_time in self.requests[identifier] 
            if req_time > window_start
        ]
        
        return max(0, max_requests - len(current_requests))


class SecurityMonitor:
    """Security monitoring and threat detection"""
    
    def __init__(self):
        self.security_events: List[SecurityEvent] = []
        self.rate_limiter = RateLimiter()
        
        # Suspicious patterns
        self.suspicious_patterns = [
            "' OR 1=1",
            "UNION SELECT",
            "<script>",
            "javascript:",
            "../",
            "passwd",
            "etc/shadow"
        ]
        
        # Failed login tracking
        self.failed_logins: Dict[str, List[datetime]] = {}
    
    def analyze_request(self, request: Request) -> Optional[SecurityEvent]:
        """Analyze incoming request for security threats"""
        
        # Check for suspicious patterns in URL and headers
        suspicious_found = []
        
        # Check URL path
        for pattern in self.suspicious_patterns:
            if pattern.lower() in str(request.url).lower():
                suspicious_found.append(f"URL contains: {pattern}")
        
        # Check User-Agent for known bad patterns
        user_agent = request.headers.get("user-agent", "").lower()
        if any(bad in user_agent for bad in ["sqlmap", "nikto", "nmap", "masscan"]):
            suspicious_found.append(f"Suspicious User-Agent: {user_agent}")
        
        # Check for unusual header combinations
        if request.headers.get("x-real-ip") and request.headers.get("x-forwarded-for"):
            # Multiple forwarding headers could indicate proxy chaining
            suspicious_found.append("Multiple forwarding headers detected")
        
        if suspicious_found:
            event = SecurityEvent(
                event_type="suspicious_request",
                severity="medium",
                details={
                    "ip": self.get_client_ip(request),
                    "user_agent": request.headers.get("user-agent"),
                    "url": str(request.url),
                    "suspicious_patterns": suspicious_found
                }
            )
            self.log_security_event(event)
            return event
        
        return None
    
    def check_rate_limit(self, request: Request, max_requests: int = 100, window_seconds: int = 3600) -> bool:
        """Check if request should be rate limited"""
        client_ip = self.get_client_ip(request)
        
        if not self.rate_limiter.is_allowed(client_ip, max_requests, window_seconds):
            event = SecurityEvent(
                event_type="rate_limit_exceeded",
                severity="high",
                details={
                    "ip": client_ip,
                    "user_agent": request.headers.get("user-agent"),
                    "url": str(request.url),
                    "max_requests": max_requests,
                    "window_seconds": window_seconds
                }
            )
            self.log_security_event(event)
            return False
        
        return True
    
    def log_failed_login(self, email: str, ip: str, user_agent: str = None):
        """Log failed login attempt"""
        now = datetime.utcnow()
        
        # Track failed logins by email
        if email not in self.failed_logins:
            self.failed_logins[email] = []
        
        # Clean old attempts (older than 1 hour)
        hour_ago = now - timedelta(hours=1)
        self.failed_logins[email] = [
            attempt for attempt in self.failed_logins[email]
            if attempt > hour_ago
        ]
        
        self.failed_logins[email].append(now)
        
        # Check for brute force attempts
        if len(self.failed_logins[email]) >= 5:
            severity = "critical" if len(self.failed_logins[email]) >= 10 else "high"
            event = SecurityEvent(
                event_type="potential_brute_force",
                severity=severity,
                details={
                    "email": email,
                    "ip": ip,
                    "user_agent": user_agent,
                    "failed_attempts": len(self.failed_logins[email]),
                    "time_window": "1 hour"
                }
            )
            self.log_security_event(event)
    
    def log_successful_login(self, user_id: str, email: str, ip: str, user_agent: str = None):
        """Log successful login"""
        # Clear failed login attempts on successful login
        if email in self.failed_logins:
            del self.failed_logins[email]
        
        event = SecurityEvent(
            event_type="successful_login",
            severity="low",
            details={
                "user_id": user_id,
                "email": email,
                "ip": ip,
                "user_agent": user_agent
            }
        )
        self.log_security_event(event)
    
    def log_security_event(self, event: SecurityEvent):
        """Log security event"""
        self.security_events.append(event)
        
        # Keep only last 1000 events to prevent memory issues
        if len(self.security_events) > 1000:
            self.security_events = self.security_events[-1000:]
        
        # Log to application logger
        logger.warning(
            f"Security Event: {event.event_type} ({event.severity}) - {json.dumps(event.details)}"
        )
    
    def get_security_summary(self, hours: int = 24) -> Dict:
        """Get security events summary for the last N hours"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        recent_events = [
            event for event in self.security_events
            if event.timestamp > cutoff
        ]
        
        # Count by type and severity
        event_types = {}
        severity_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        
        for event in recent_events:
            event_types[event.event_type] = event_types.get(event.event_type, 0) + 1
            severity_counts[event.severity] += 1
        
        return {
            "total_events": len(recent_events),
            "event_types": event_types,
            "severity_counts": severity_counts,
            "time_window_hours": hours,
            "high_priority_events": len([e for e in recent_events if e.severity in ["high", "critical"]])
        }
    
    def get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        # Check for forwarded IP headers (for reverse proxies)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fall back to direct client IP
        return request.client.host if request.client else "unknown"


# Global security monitor instance
security_monitor = SecurityMonitor()


class SecurityMiddleware:
    """Security middleware for request analysis"""
    
    def __init__(self):
        self.monitor = security_monitor
    
    async def __call__(self, request: Request, call_next):
        """Middleware call"""
        
        # Check rate limiting
        if not self.monitor.check_rate_limit(request):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later."
            )
        
        # Analyze request for security threats
        security_event = self.monitor.analyze_request(request)
        
        # For now, we log but don't block suspicious requests
        # In production, you might want to block certain high-risk patterns
        
        response = await call_next(request)
        return response


def require_https():
    """Decorator to require HTTPS in production"""
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            if not request.url.scheme == "https" and not request.url.hostname in ["localhost", "127.0.0.1"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="HTTPS required"
                )
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator