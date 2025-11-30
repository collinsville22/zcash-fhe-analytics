"""
JWT and API Key Authentication System
Manages user authentication and authorization
"""

from flask import request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from functools import wraps
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class AuthManager:
    """Manages JWT tokens and API keys"""
    
    def __init__(self, app, database):
        self.app = app
        self.db = database
        self.jwt = JWTManager(app)
    
    @staticmethod
    def generate_api_key() -> str:
        """Generate cryptographically secure API key"""
        random_bytes = secrets.token_bytes(32)
        return hashlib.sha256(random_bytes).hexdigest()
    
    def create_api_key(self, name: str, expires_days: int = None) -> str:
        """
        Create new API key
        
        Args:
            name: Descriptive name for the key
            expires_days: Expiration in days (None = no expiration)
        
        Returns:
            Generated API key string
        """
        from models import APIKey
        
        key_string = self.generate_api_key()
        session = self.db.get_session()
        
        api_key = APIKey(
            key=key_string,
            name=name,
            expires_at=datetime.utcnow() + timedelta(days=expires_days) if expires_days else None,
            can_ingest=True,
            can_read_metrics=True
        )
        
        session.add(api_key)
        session.commit()
        
        logger.info(f"Created API key: {name}")
        return key_string
    
    def validate_api_key(self, key: str) -> Optional['APIKey']:
        """
        Validate API key
        
        Args:
            key: API key string to validate
        
        Returns:
            APIKey object if valid, None otherwise
        """
        from models import APIKey
        
        session = self.db.get_session()
        api_key = session.query(APIKey).filter_by(key=key).first()
        
        if not api_key:
            return None
        
        if api_key.expires_at and api_key.expires_at < datetime.utcnow():
            return None
        
        api_key.requests_count += 1
        api_key.last_used = datetime.utcnow()
        session.commit()
        
        return api_key


def require_api_key(f):
    """
    Decorator requiring valid API key
    
    Usage:
        @app.route('/api/endpoint')
        @require_api_key
        def endpoint():
            return jsonify({"result": "success"})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        
        if not api_key:
            return jsonify({"error": "API key required"}), 401
        
        from flask import current_app
        auth_manager = current_app.config.get('AUTH_MANAGER')
        
        validated_key = auth_manager.validate_api_key(api_key)
        if not validated_key:
            return jsonify({"error": "Invalid API key"}), 401
        
        request.api_key = validated_key
        return f(*args, **kwargs)
    
    return decorated_function


def optional_api_key(f):
    """
    Decorator allowing optional API key
    Provides enhanced limits/features if key present
    
    Usage:
        @app.route('/api/public_endpoint')
        @optional_api_key
        def endpoint():
            return jsonify({"result": "success"})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        
        if api_key:
            from flask import current_app
            auth_manager = current_app.config.get('AUTH_MANAGER')
            validated_key = auth_manager.validate_api_key(api_key)
            request.api_key = validated_key
        else:
            request.api_key = None
        
        return f(*args, **kwargs)
    
    return decorated_function
