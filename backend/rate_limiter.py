"""
Rate Limiting with Redis Support
Protects API endpoints from abuse
"""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import request
import logging

logger = logging.getLogger(__name__)


def get_api_key_or_ip():
    """Get rate limit key based on API key or IP address"""
    if hasattr(request, 'api_key') and request.api_key:
        return f"api_key:{request.api_key.key}"
    return f"ip:{get_remote_address()}"


class RateLimiter:
    """Manages API rate limiting"""
    
    def __init__(self, app, redis_url: str = None):
        self.app = app
        
        storage_uri = redis_url if redis_url and 'redis' in redis_url else 'memory://'
        
        self.limiter = Limiter(
            app=app,
            key_func=get_api_key_or_ip,
            default_limits=["500 per hour", "100 per minute"],
            storage_uri=storage_uri,
            strategy="fixed-window"
        )
        
        logger.info(f"Rate limiter initialized: {storage_uri}")


def custom_rate_limit(limit_string: str):
    """
    Custom rate limit decorator
    
    Args:
        limit_string: Rate limit (e.g., "10 per minute")
    
    Usage:
        @app.route('/api/endpoint')
        @custom_rate_limit("50 per minute")
        def endpoint():
            return jsonify({"result": "success"})
    """
    def decorator(f):
        from flask import current_app
        rate_limiter = current_app.config.get('RATE_LIMITER')
        if rate_limiter:
            return rate_limiter.limiter.limit(limit_string)(f)
        return f
    return decorator
