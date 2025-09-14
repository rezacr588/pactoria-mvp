#!/usr/bin/env python3
"""
Test script to debug SQLAlchemy enum issue
"""

import sys
sys.path.append('/Users/rezazeraat/Desktop/Pactoria-MVP/backend')

from app.infrastructure.database.models import User, UserRole
from app.core.database import SessionLocal

def test_user_query():
    """Test querying the demo user to see the exact error"""
    db = SessionLocal()
    
    try:
        print("Testing user query...")
        user = db.query(User).filter(User.email == "demo@pactoria.com").first()
        if user:
            print(f"✅ User found: {user.email}")
            print(f"✅ Role: {user.role}")
            print(f"✅ Role type: {type(user.role)}")
        else:
            print("❌ No user found")
    except Exception as e:
        print(f"❌ Error: {e}")
        print(f"❌ Error type: {type(e)}")
        
        # Check the enum values
        print(f"\nUserRole enum values:")
        for role in UserRole:
            print(f"  {role.name} = {role.value}")
    finally:
        db.close()

if __name__ == "__main__":
    test_user_query()