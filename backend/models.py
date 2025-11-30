"""
Database Models for Production FHE Analytics
SQLAlchemy ORM models for persistent storage
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json

Base = declarative_base()

class EncryptedSwap(Base):
    """Store encrypted swap data"""
    __tablename__ = 'encrypted_swaps'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    encrypted_amount_in = Column(Text, nullable=False)
    encrypted_amount_out = Column(Text, nullable=False)
    encrypted_fee = Column(Text, nullable=True)
    encrypted_exchange_rate = Column(Text, nullable=True)
    destination_asset = Column(String(10), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=True)
    ingested_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'encrypted_amount_in': json.loads(self.encrypted_amount_in) if isinstance(self.encrypted_amount_in, str) else self.encrypted_amount_in,
            'encrypted_amount_out': json.loads(self.encrypted_amount_out) if isinstance(self.encrypted_amount_out, str) else self.encrypted_amount_out,
            'encrypted_fee': json.loads(self.encrypted_fee) if self.encrypted_fee and isinstance(self.encrypted_fee, str) else self.encrypted_fee,
            'encrypted_exchange_rate': json.loads(self.encrypted_exchange_rate) if self.encrypted_exchange_rate and isinstance(self.encrypted_exchange_rate, str) else self.encrypted_exchange_rate,
            'destination_asset': self.destination_asset,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'ingested_at': self.ingested_at.isoformat()
        }


class EncryptedTransaction(Base):
    __tablename__ = 'encrypted_transactions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    encrypted_amount = Column(Text, nullable=False)
    encrypted_fee = Column(Text, nullable=True)
    
    tx_type = Column(String(20), nullable=False, index=True)
    pool_type = Column(String(20), nullable=True, index=True)
    platform = Column(String(20), nullable=True, index=True)
    
    timestamp = Column(DateTime, nullable=True)
    ingested_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'encrypted_amount': json.loads(self.encrypted_amount) if isinstance(self.encrypted_amount, str) else self.encrypted_amount,
            'encrypted_fee': json.loads(self.encrypted_fee) if self.encrypted_fee and isinstance(self.encrypted_fee, str) else self.encrypted_fee,
            'tx_type': self.tx_type,
            'pool_type': self.pool_type,
            'platform': self.platform,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'ingested_at': self.ingested_at.isoformat()
        }



class APIKey(Base):
    """API keys for wallet authentication"""
    __tablename__ = 'api_keys'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    can_ingest = Column(Boolean, default=True)
    can_read_metrics = Column(Boolean, default=True)
    requests_count = Column(Integer, default=0)
    last_used = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    rate_limit_override = Column(Integer, nullable=True)
    
    def increment_usage(self):
        """Track API key usage"""
        self.requests_count += 1
        self.last_used = datetime.utcnow()


class DecryptionLog(Base):
    """Log threshold decryption operations for audit"""
    __tablename__ = 'decryption_logs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    metric_name = Column(String(50), nullable=False, index=True)
    decrypted_value = Column(Float, nullable=False)
    num_swaps = Column(Integer, nullable=False)
    
    nodes_used = Column(Integer, nullable=False)
    threshold = Column(Integer, nullable=False)
    decrypted_at = Column(DateTime, default=datetime.utcnow, index=True)
    requested_by = Column(String(100), nullable=True)


class SystemMetric(Base):
    """Store system health metrics over time"""
    __tablename__ = 'system_metrics'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    metric_name = Column(String(50), nullable=False, index=True)
    value = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)
    metadata = Column(JSON, nullable=True)


class Database:
    """Database connection manager"""
    
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url, echo=False)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.session = None
    
    def create_tables(self):
        """Create all tables"""
        Base.metadata.create_all(self.engine)
    
    def get_session(self):
        """Get database session"""
        if self.session is None:
            self.session = self.SessionLocal()
        return self.session
    
    def close(self):
        """Close session"""
        if self.session:
            self.session.close()
            self.session = None


_db_instance = None

def get_database(database_url: str = None) -> Database:
    """Get or create database instance"""
    global _db_instance
    if _db_instance is None:
        if database_url is None:
            from config import config
            database_url = config.DATABASE_URL
        _db_instance = Database(database_url)
    return _db_instance
