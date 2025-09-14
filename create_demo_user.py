#!/usr/bin/env python3
"""
Script to create demo user for Pactoria MVP
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.append('/Users/rezazeraat/Desktop/Pactoria-MVP/backend')

from app.core.database import get_db
from app.core.security import hash_password
from app.infrastructure.database.models import User, Company, UserRole
from datetime import datetime
from sqlalchemy.orm import Session


async def create_demo_user():
    """Create demo user and company"""

    async for db in get_db():
        try:
            # Check if demo user already exists
            existing_user = db.query(User).filter(User.email == "demo@pactoria.com").first()
            if existing_user:
                print("Demo user already exists!")
                return

            # Check if demo company exists
            existing_company = db.query(Company).filter(Company.name == "Demo Company").first()
            if not existing_company:
                # Create demo company
                company = Company(
                    id="demo-company-id",
                    name="Demo Company",
                    subscription_tier="PROFESSIONAL",
                    max_users=10,
                    created_at=datetime.utcnow()
                )
                db.add(company)
                await db.commit()
                await db.refresh(company)
                print("✅ Demo company created")
            else:
                company = existing_company

            # Create demo user
            hashed_password = hash_password("demo12345")

            demo_user = User(
                id="demo-user-id",
                email="demo@pactoria.com",
                full_name="Demo User",
                hashed_password=hashed_password,
                is_active=True,
                role=UserRole.ADMIN,
                timezone="Europe/London",
                company_id=company.id,
                created_at=datetime.utcnow(),
                last_login_at=None
            )

            db.add(demo_user)
            await db.commit()
            await db.refresh(demo_user)

            print("✅ Demo user created successfully!")
            print("Email: demo@pactoria.com")
            print("Password: demo12345")

        except Exception as e:
            print(f"❌ Error creating demo user: {e}")
            await db.rollback()
        finally:
            await db.close()


if __name__ == "__main__":
    asyncio.run(create_demo_user())
