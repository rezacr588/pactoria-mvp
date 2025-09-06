#!/usr/bin/env python3
"""
Test login functionality directly
"""

import sqlite3
import bcrypt
import json

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def test_login(email: str, password: str):
    """Test login with direct database access"""
    
    conn = sqlite3.connect('pactoria_mvp.db')
    cursor = conn.cursor()
    
    try:
        # Get user
        cursor.execute("SELECT id, email, full_name, hashed_password, is_active, company_id FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        
        if not user:
            print(f"❌ User not found: {email}")
            return False
        
        user_id, user_email, full_name, hashed_password, is_active, company_id = user
        
        print(f"✅ User found: {full_name} ({user_email})")
        print(f"   Active: {bool(is_active)}")
        print(f"   Company ID: {company_id}")
        
        # Verify password
        if verify_password(password, hashed_password):
            print("✅ Password correct!")
            
            # Get company info
            cursor.execute("SELECT name, subscription_tier FROM companies WHERE id = ?", (company_id,))
            company = cursor.fetchone()
            if company:
                print(f"   Company: {company[0]}")
                print(f"   Subscription: {company[1]}")
            
            return True
        else:
            print("❌ Password incorrect!")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("\n🔐 Testing Demo User Login\n")
    print("-" * 40)
    
    # Test with correct credentials
    print("\nTest 1: Correct credentials")
    test_login("demo@pactoria.com", "Demo123!")
    
    print("\n" + "-" * 40)
    print("\nTest 2: Wrong password")
    test_login("demo@pactoria.com", "demo123")
    
    print("\n" + "-" * 40)
    print("\n✅ If password verification works above, the issue is with the ORM relationships")
