#!/usr/bin/env python3
"""
Test script for dashboard analytics endpoint
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def login_and_get_token():
    """Login and get JWT token"""
    login_data = {
        "email": "demo@pactoria.com",
        "password": "Demo123!"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"Login response: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Login response data: {data}")
        return data.get('token', {}).get('access_token')
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def test_dashboard(token):
    """Test the dashboard analytics endpoint"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(f"{BASE_URL}/analytics/dashboard", headers=headers)
    print(f"Dashboard endpoint status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("Dashboard data received successfully!")
        print(json.dumps(data, indent=2))
        return True
    else:
        print(f"Dashboard request failed: {response.text}")
        return False

def main():
    print("Testing dashboard analytics endpoint...")
    
    # Step 1: Login
    print("1. Logging in...")
    token = login_and_get_token()
    if not token:
        print("❌ Login failed")
        return
    
    print("✅ Login successful")
    
    # Step 2: Test dashboard
    print("2. Testing dashboard endpoint...")
    success = test_dashboard(token)
    
    if success:
        print("✅ Dashboard endpoint working correctly")
    else:
        print("❌ Dashboard endpoint failed")

if __name__ == "__main__":
    main()