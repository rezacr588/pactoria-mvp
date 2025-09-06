#!/usr/bin/env python3
"""
Create a demo user for testing the Pactoria MVP application
"""

import os
import sys
from datetime import datetime
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.infrastructure.database.models import User, Company
from app.core.security import get_password_hash
import uuid

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pactoria_mvp.db")

# Create database engine and session
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_demo_user():
    """Create a demo user with a company"""
    session = SessionLocal()
    
    try:
        # Check if demo user already exists
        existing_user = session.query(User).filter(User.email == "demo@pactoria.com").first()
        if existing_user:
            print("✅ Demo user already exists!")
            print("\n📧 Email: demo@pactoria.com")
            print("🔑 Password: Demo123!")
            return
        
        # Create a demo company first
        demo_company = Company(
            id=str(uuid.uuid4()),
            name="Demo Company Ltd",
            registration_number="12345678",
            address="123 Demo Street, London, UK",
            phone="+44 20 1234 5678",
            email="contact@democompany.com",
            website="https://democompany.com",
            industry="Technology",
            company_size="10-50",
            subscription_tier="professional",
            max_users=5,
            max_contracts=100,
            ai_credits_monthly=1000,
            ai_credits_used=0,
            storage_limit_gb=10,
            storage_used_gb=0,
            created_at=datetime.utcnow()
        )
        session.add(demo_company)
        session.flush()  # Flush to get the company ID
        
        # Create demo user
        demo_user = User(
            id=str(uuid.uuid4()),
            email="demo@pactoria.com",
            full_name="Demo User",
            hashed_password=get_password_hash("Demo123!"),
            is_active=True,
            is_superuser=False,
            company_id=demo_company.id,
            role="admin",
            timezone="Europe/London",
            created_at=datetime.utcnow(),
            email_verified=True,
            email_verified_at=datetime.utcnow()
        )
        session.add(demo_user)
        
        # Commit the transaction
        session.commit()
        
        print("✅ Demo user created successfully!")
        print("\n🎉 You can now sign in with:")
        print("📧 Email: demo@pactoria.com")
        print("🔑 Password: Demo123!")
        print("\n💼 Company: Demo Company Ltd")
        print("📊 Subscription: Professional")
        print("🤖 AI Credits: 1000/month")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error creating demo user: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    create_demo_user()
