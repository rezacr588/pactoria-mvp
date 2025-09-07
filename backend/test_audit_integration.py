#!/usr/bin/env python3
"""
Test script for audit trail integration
Tests both successful and failed login attempts, and audit trail retrieval
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000/api/v1"

def test_failed_login():
    """Test failed login attempt (should create audit log)"""
    print("Testing failed login attempt...")
    
    login_data = {
        "email": "nonexistent@example.com",
        "password": "WrongPassword123!"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"Failed login response: {response.status_code}")
    
    if response.status_code == 401:
        print("✅ Failed login correctly rejected")
        return True
    else:
        print(f"❌ Unexpected response: {response.status_code} - {response.text}")
        return False

def login_and_get_token():
    """Login with valid credentials and get JWT token"""
    login_data = {
        "email": "demo@pactoria.com",
        "password": "Demo123!"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"Login response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Successful login")
        return data.get('token', {}).get('access_token')
    else:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return None

def test_audit_entries(token):
    """Test the audit entries endpoint"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(f"{BASE_URL}/audit/entries", headers=headers)
    print(f"Audit entries endpoint status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Audit entries retrieved successfully!")
        print(f"Total entries: {data.get('total', 0)}")
        
        # Print recent entries
        entries = data.get('entries', [])
        if entries:
            print("\nRecent audit entries:")
            for entry in entries[:5]:  # Show first 5 entries
                print(f"- {entry.get('timestamp')} | {entry.get('user_name')} | {entry.get('action')} | {entry.get('details')}")
        else:
            print("No audit entries found (this could be normal for a fresh system)")
        
        return True
    else:
        print(f"❌ Audit entries request failed: {response.text}")
        return False

def test_audit_stats(token):
    """Test the audit statistics endpoint"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(f"{BASE_URL}/audit/stats", headers=headers)
    print(f"Audit stats endpoint status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Audit statistics retrieved successfully!")
        print(f"Total events: {data.get('total_events', 0)}")
        print(f"High risk events: {data.get('high_risk_events', 0)}")
        print(f"Events today: {data.get('events_today', 0)}")
        return True
    else:
        print(f"❌ Audit stats request failed: {response.text}")
        return False

def test_audit_search(token):
    """Test audit search functionality"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Search for login actions
    params = {"action": "login", "page": 1, "size": 10}
    response = requests.get(f"{BASE_URL}/audit/entries", headers=headers, params=params)
    
    print(f"Audit search (login actions) status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Audit search working!")
        print(f"Login events found: {data.get('total', 0)}")
        return True
    else:
        print(f"❌ Audit search failed: {response.text}")
        return False

def main():
    print("Testing audit trail integration...")
    print("=" * 50)
    
    # Test 1: Failed login (should create audit log)
    print("1. Testing failed login attempt...")
    test_failed_login()
    
    # Add small delay to ensure audit log is written
    time.sleep(0.5)
    
    # Test 2: Successful login
    print("\n2. Testing successful login...")
    token = login_and_get_token()
    if not token:
        print("❌ Cannot proceed without valid token")
        return
    
    # Add small delay to ensure audit log is written
    time.sleep(0.5)
    
    # Test 3: Retrieve audit entries
    print("\n3. Testing audit entries retrieval...")
    success = test_audit_entries(token)
    
    # Test 4: Retrieve audit statistics
    print("\n4. Testing audit statistics...")
    success = test_audit_stats(token)
    
    # Test 5: Test audit search
    print("\n5. Testing audit search functionality...")
    success = test_audit_search(token)
    
    print("\n" + "=" * 50)
    print("Audit trail integration test completed!")
    print("Check the audit entries above to verify login events were logged.")

if __name__ == "__main__":
    main()