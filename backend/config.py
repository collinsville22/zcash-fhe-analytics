"""
Environment-based Configuration Management
Loads settings from environment variables with validation
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration"""
    
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///fhe_analytics.db')
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    FHE_SECURITY_LEVEL = os.getenv('FHE_SECURITY_LEVEL', 'high')
    
    RATE_LIMIT_PER_MINUTE = int(os.getenv('RATE_LIMIT_PER_MINUTE', '100'))
    RATE_LIMIT_PER_HOUR = int(os.getenv('RATE_LIMIT_PER_HOUR', '500'))
    
    API_KEY_SALT = os.getenv('API_KEY_SALT', 'default-salt-change-in-production')
    
    SEPOLIA_RPC_URL = os.getenv('SEPOLIA_RPC_URL', '')
    PRIVATE_KEY = os.getenv('PRIVATE_KEY', '')
    ETHERSCAN_API_KEY = os.getenv('ETHERSCAN_API_KEY', '')
    
    PROMETHEUS_PORT = int(os.getenv('PROMETHEUS_PORT', '9090'))
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5000,http://127.0.0.1:5000').split(',')
    
    JWT_ACCESS_TOKEN_EXPIRES = 86400
    
    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production environment"""
        return cls.FLASK_ENV == 'production'
    
    @classmethod
    def validate(cls):
        """Validate configuration for production deployment"""
        if cls.is_production():
            assert cls.SECRET_KEY != 'dev-secret-key-change-in-production', \
                "SECRET_KEY must be changed in production"
            assert cls.JWT_SECRET_KEY != 'jwt-secret-key-change-in-production', \
                "JWT_SECRET_KEY must be changed in production"
            assert cls.API_KEY_SALT != 'default-salt-change-in-production', \
                "API_KEY_SALT must be changed in production"
            assert 'postgresql' in cls.DATABASE_URL or 'mysql' in cls.DATABASE_URL, \
                "Production requires PostgreSQL or MySQL database"


config = Config()
