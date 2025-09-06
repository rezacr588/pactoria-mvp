"""
Production Connection Safety Middleware
Adds safety warnings and headers when local environment connects to production
"""

import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
from ..core.config import settings

logger = logging.getLogger(__name__)


class ProductionSafetyMiddleware(BaseHTTPMiddleware):
    """Middleware to add safety warnings for production connections"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Process the request
        response = await call_next(request)

        # Add safety headers if in production connection mode
        if (
            hasattr(settings, "PRODUCTION_CONNECTION_WARNING")
            and settings.PRODUCTION_CONNECTION_WARNING
        ):
            response.headers["X-Production-Warning"] = "true"
            response.headers["X-Connection-Mode"] = "local-to-production"
            response.headers["X-Data-Warning"] = (
                "All changes are permanent in production"
            )

            # Log production operations for audit trail
            if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
                logger.warning(
                    f"🔴 PRODUCTION OPERATION: {request.method} {request.url.path} "
                    f"from {request.client.host if request.client else 'unknown'}"
                )

                # Add extra warning header for data-modifying operations
                response.headers["X-Data-Modification-Warning"] = (
                    "PRODUCTION data modified"
                )

        return response
