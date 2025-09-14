#!/usr/bin/env python3
"""
Create test users with different roles for testing the permission system
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

def create_test_users():
    """Create test users with different roles"""
    
    # Connect to database
    conn = sqlite3.connect('pactoria_mvp.db')
    cursor = conn.cursor()
    
    try:
        # Test users configuration
        test_users = [
            {
                'email': 'admin@pactoria.com',
                'password': 'Admin123!',
                'name': 'Admin User',
                'role': 'ADMIN',
                'is_admin': True,
                'description': 'Full admin access - can manage everything'
            },
            {
                'email': 'manager@pactoria.com', 
                'password': 'Manager123!',
                'name': 'Contract Manager',
                'role': 'CONTRACT_MANAGER',
                'is_admin': False,
                'description': 'Can manage contracts and view analytics'
            },
            {
                'email': 'reviewer@pactoria.com',
                'password': 'Reviewer123!',
                'name': 'Legal Reviewer',
                'role': 'LEGAL_REVIEWER', 
                'is_admin': False,
                'description': 'Can review contracts and access audit logs'
            },
            {
                'email': 'viewer@pactoria.com',
                'password': 'Viewer123!',
                'name': 'Basic Viewer',
                'role': 'VIEWER',
                'is_admin': False,
                'description': 'Can only view contracts - limited access'
            }
        ]
        
        # Get or create demo company
        cursor.execute("SELECT id FROM companies WHERE name = ?", ("Demo Company Ltd",))
        company_result = cursor.fetchone()
        
        if company_result:
            company_id = company_result[0]
            print("✅ Using existing Demo Company")
        else:
            # Create a placeholder admin user first for company creation
            admin_user_id = str(uuid.uuid4())
            company_id = str(uuid.uuid4())
            
            # Create minimal company record first
            cursor.execute("""
                INSERT INTO companies (
                    id, name, company_type, industry, company_size,
                    status, primary_contact_email,
                    address_line1, city, postcode, country,
                    subscription_tier, max_users, max_contracts_per_month,
                    is_verified, created_by_user_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                company_id, "Demo Company Ltd", "PRIVATE_LIMITED", 
                "TECHNOLOGY", "SMALL", "ACTIVE", "contact@democompany.com",
                "123 Demo Street", "London", "SW1A 1AA", "United Kingdom",
                "PROFESSIONAL", 10, 100, True, admin_user_id, datetime.utcnow().isoformat()
            ))
            print("✅ Created Demo Company")
        
        # Create test users
        created_users = []
        
        for user_data in test_users:
            # Check if user already exists
            cursor.execute("SELECT id FROM users WHERE email = ?", (user_data['email'],))
            if cursor.fetchone():
                print(f"⚠️  User {user_data['email']} already exists, skipping...")
                continue
            
            # Create user
            user_id = str(uuid.uuid4())
            hashed_password = hash_password(user_data['password'])
            
            cursor.execute("""
                INSERT INTO users (
                    id, email, hashed_password, full_name, company_id, 
                    role, is_admin, is_active, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, user_data['email'], hashed_password, user_data['name'], 
                company_id, user_data['role'], user_data['is_admin'], True,
                datetime.utcnow().isoformat()
            ))
            
            created_users.append(user_data)
            print(f"✅ Created user: {user_data['name']} ({user_data['role']})")
        
        # Commit changes
        conn.commit()
        
        # Display test user credentials
        print("\n" + "="*60)
        print("🧪 TEST USERS CREATED FOR PERMISSION TESTING")
        print("="*60)
        
        for user_data in created_users:
            print(f"\n👤 {user_data['name']} ({user_data['role']})")
            print(f"   📧 Email: {user_data['email']}")
            print(f"   🔑 Password: {user_data['password']}")
            print(f"   📝 Description: {user_data['description']}")
        
        print("\n" + "="*60)
        print("🎯 PERMISSION TESTING GUIDE")
        print("="*60)
        print("1. Login as each user and verify navigation visibility:")
        print("   • Admin: Should see all navigation items")
        print("   • Contract Manager: Should see Contracts, Analytics, Templates")
        print("   • Legal Reviewer: Should see Audit Trail, Compliance sections")
        print("   • Viewer: Should see limited navigation, no create/edit buttons")
        print("\n2. Test specific features:")
        print("   • 'New Contract' button visibility")
        print("   • Edit/Delete actions on contracts")
        print("   • Team management access")
        print("   • Analytics and compliance sections")
        print("   • Quick actions on dashboard")
        
        print(f"\n🌐 Frontend URL: http://localhost:5173")
        print(f"📚 API Docs: http://localhost:8000/docs")
        
    except Exception as e:
        print(f"❌ Error creating test users: {e}")
        conn.rollback()
    
    finally:
        conn.close()

if __name__ == "__main__":
    create_test_users()