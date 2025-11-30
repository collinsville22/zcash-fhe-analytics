"""
Redis Caching Layer
Reduces redundant FHE computations
"""

import redis
import json
import hashlib
from typing import Any, Optional, Callable
from functools import wraps
import logging

logger = logging.getLogger(__name__)


class CacheManager:
    """Redis-based caching for expensive operations"""
    
    def __init__(self, redis_url: str = 'redis://localhost:6379/0'):
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            self.redis_client.ping()
            self.enabled = True
            logger.info(f"Cache manager initialized: {redis_url}")
        except Exception as e:
            logger.warning(f"Redis not available, caching disabled: {e}")
            self.redis_client = None
            self.enabled = False
    
    def get(self, key: str) -> Optional[Any]:
        """Retrieve value from cache"""
        if not self.enabled:
            return None
        
        try:
            value = self.redis_client.get(key)
            if value:
                logger.debug(f"Cache hit: {key}")
                return json.loads(value)
            logger.debug(f"Cache miss: {key}")
            return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: int = 300):
        """Store value in cache with TTL"""
        if not self.enabled:
            return False
        
        try:
            self.redis_client.setex(key, ttl, json.dumps(value))
            logger.debug(f"Cache set: {key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    def delete(self, key: str):
        """Remove key from cache"""
        if not self.enabled:
            return
        
        try:
            self.redis_client.delete(key)
            logger.debug(f"Cache delete: {key}")
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
    
    def clear_pattern(self, pattern: str):
        """Remove all keys matching pattern"""
        if not self.enabled:
            return
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
                logger.info(f"Cache cleared: {len(keys)} keys matching '{pattern}'")
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        if not self.enabled:
            return {"enabled": False}
        
        try:
            info = self.redis_client.info()
            return {
                "enabled": True,
                "connected_clients": info.get('connected_clients', 0),
                "used_memory_human": info.get('used_memory_human', 'N/A'),
                "total_commands_processed": info.get('total_commands_processed', 0),
                "keyspace_hits": info.get('keyspace_hits', 0),
                "keyspace_misses": info.get('keyspace_misses', 0)
            }
        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {"enabled": True, "error": str(e)}


def cached(ttl: int = 300, key_prefix: str = ''):
    """Decorator to cache function results"""
    def decorator(f: Callable):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from flask import current_app
            
            cache = current_app.config.get('CACHE_MANAGER')
            if not cache or not cache.enabled:
                return f(*args, **kwargs)
            
            key_parts = [key_prefix, f.__name__]
            
            args_str = json.dumps({
                'args': args,
                'kwargs': kwargs
            }, sort_keys=True, default=str)
            args_hash = hashlib.md5(args_str.encode()).hexdigest()
            key_parts.append(args_hash)
            
            cache_key = ':'.join(filter(None, key_parts))
            
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            result = f(*args, **kwargs)
            cache.set(cache_key, result, ttl=ttl)
            
            return result
        
        return decorated_function
    return decorator


_cache_instance = None

def get_cache_manager(redis_url: str = None) -> CacheManager:
    """Get or create cache manager instance"""
    global _cache_instance
    if _cache_instance is None:
        if redis_url is None:
            from config import config
            redis_url = config.REDIS_URL
        _cache_instance = CacheManager(redis_url)
    return _cache_instance
