#!/usr/bin/env python3
"""
Create a demo user for testing - simplified version
"""

import sqlite3
import uuid
from datetime import datetime
import bcrypt

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_demo_user():
    """Create demo user and company directly in database"""
    
    # Connect to database
    conn = sqlite3.connect('pactoria_mvp.db')
    cursor = conn.cursor()
    
    try:
        # Check if demo user exists
        cursor.execute("SELECT id FROM users WHERE email = ?", ("demo@pactoria.com",))
        if cursor.fetchone():
            print("✅ Demo user already exists!")
            print("\n📧 Email: demo@pactoria.com")
            print("🔑 Password: Demo123!")
            return
        
        # Create user ID first (we'll need it for company)
        user_id = str(uuid.uuid4())
        
        # Create company
        company_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO companies (
                id, name, company_type, company_number, vat_number, industry, company_size,
                status, primary_contact_email, phone_number, website,
                address_line1, city, postcode, country,
                subscription_tier, max_users, max_contracts_per_month,
                is_verified, is_vat_registered, created_by_user_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            company_id, "Demo Company Ltd", "limited_company", "12345678", "GB123456789",
            "technology", "10-50", "active", "contact@democompany.com", "+44 20 1234 5678",
            "https://democompany.com", "123 Demo Street", "London", "SW1A 1AA", "United Kingdom",
            "professional", 5, 100,
            1, 1, user_id, datetime.utcnow().isoformat()
        ))
        
        # Create user (using ID from above)
        hashed_pw = hash_password("Demo123!")
        cursor.execute("""
            INSERT INTO users (
                id, email, full_name, hashed_password, is_active, is_admin,
                company_id, role, timezone, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, "demo@pactoria.com", "Demo User", hashed_pw, 1, 1,
            company_id, "admin", "Europe/London", datetime.utcnow().isoformat()
        ))
        
        # Commit changes
        conn.commit()
        
        print("✅ Demo user created successfully!")
        print("\n🎉 You can now sign in with:")
        print("📧 Email: demo@pactoria.com")
        print("🔑 Password: Demo123!")
        print("\n💼 Company: Demo Company Ltd")
        print("📊 Subscription: Professional")
        print("🤖 AI Credits: 1000/month")
        print("\n🌐 Open: http://localhost:5173/login")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    create_demo_user()
