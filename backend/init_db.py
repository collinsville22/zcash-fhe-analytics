"""
Standalone Database Initialization
No dependencies on app.py - can run independently
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from config import config
from models import get_database, APIKey
from datetime import datetime, timedelta
import secrets
import hashlib

def initialize_database():
    """Create all database tables"""
    print("=" * 60)
    print("Initializing Zcash FHE Analytics Database")
    print("=" * 60)

    print(f"\nConfiguration:")
    print(f"  Database: {config.DATABASE_URL}")
    print(f"  FHE Security: {config.FHE_SECURITY_LEVEL}")
    print(f"  Environment: {config.FLASK_ENV}")
    
    print(f"\nCreating database tables...")
    db = get_database()
    db.create_tables()
    
    print("\n Database initialized successfully!")
    print("\nTables created:")
    print("   encrypted_swaps")
    print("   api_keys")
    print("   decryption_logs")
    print("   system_metrics")
    print("=" * 60)

def generate_api_key():
    """Generate cryptographically secure API key"""
    random_bytes = secrets.token_bytes(32)
    return hashlib.sha256(random_bytes).hexdigest()

def create_demo_api_key():
    """Create a demo API key for testing"""
    print("\nCreating demo API key...")
    
    db = get_database()
    session = db.get_session()
    
    api_key_string = generate_api_key()
    
    api_key = APIKey(
        key=api_key_string,
        name="Demo Wallet",
        expires_at=datetime.utcnow() + timedelta(days=30),
        can_ingest=True,
        can_read_metrics=True
    )
    
    session.add(api_key)
    session.commit()
    
    print(f"\n Demo API Key Created:")
    print(f"   Key: {api_key_string}")
    print(f"   Name: Demo Wallet")
    print(f"   Expires: 30 days")
    print(f"\n   Usage in requests:")
    print(f"   -H 'X-API-Key: {api_key_string}'")
    print("\n   Save this key - you'll need it for testing!")
    print("=" * 60)
    
    return api_key_string

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Initialize database')
    parser.add_argument('--create-demo-key', action='store_true', help='Create demo API key')
    parser.add_argument('--create-key', type=str, help='Create API key with specific name')
    
    args = parser.parse_args()
    
    initialize_database()

    if args.create_demo_key:
        create_demo_api_key()

    if args.create_key:
        print(f"\nCreating API key for: {args.create_key}...")
        
        db = get_database()
        session = db.get_session()
        
        key_string = generate_api_key()
        api_key = APIKey(
            key=key_string,
            name=args.create_key,
            can_ingest=True,
            can_read_metrics=True
        )
        
        session.add(api_key)
        session.commit()
        
        print(f" API Key: {key_string}")
        print("=" * 60)
