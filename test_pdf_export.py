#!/usr/bin/env python3
"""
Test PDF export endpoint directly without needing existing contracts
"""

import requests
import json

def test_pdf_export_availability():
    """Test if the PDF export endpoint is available and not returning 503"""
    
    print("🔍 Testing PDF Export Endpoint Availability\n")
    
    # Test login first
    login_url = "http://localhost:8000/api/v1/auth/login"
    login_data = {
        "email": "demo@pactoria.com",
        "password": "Demo123!"
    }
    
    try:
        login_response = requests.post(login_url, json=login_data)
        if login_response.status_code == 200:
            token = login_response.json()["token"]["access_token"]
            print("✅ Login successful")
        else:
            print(f"❌ Login failed: {login_response.status_code}")
            return
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    # Try to get contracts
    contracts_url = "http://localhost:8000/api/v1/contracts"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        contracts_response = requests.get(contracts_url, headers=headers)
        print(f"Contracts API status: {contracts_response.status_code}")
        
        if contracts_response.status_code == 200:
            try:
                contracts_data = contracts_response.json()
                
                # Handle different response formats
                if isinstance(contracts_data, list):
                    contracts = contracts_data
                elif isinstance(contracts_data, dict) and 'contracts' in contracts_data:
                    contracts = contracts_data['contracts']
                elif isinstance(contracts_data, dict) and 'data' in contracts_data:
                    contracts = contracts_data['data']
                else:
                    contracts = []
                    
                print(f"📄 Found {len(contracts)} contracts")
                
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse contracts response: {e}")
                print(f"Raw response: {contracts_response.text[:200]}...")
                contracts = []
        else:
            print(f"❌ Contracts API failed: {contracts_response.status_code}")
            print(f"Response: {contracts_response.text}")
            contracts = []
        
        if not contracts:
            print("ℹ️  No existing contracts found")
            print("ℹ️  Creating a test contract...")
            
            # Create a test contract
            create_contract_data = {
                "title": "Test PDF Export Contract",
                "contract_type": "service_agreement",
                "content": "This is a test contract for verifying PDF export functionality after fixing dependencies."
            }
            
            create_response = requests.post(contracts_url, json=create_contract_data, headers=headers)
            if create_response.status_code in [200, 201]:
                contract = create_response.json()
                contract_id = contract.get("id")
                print(f"✅ Test contract created with ID: {contract_id}")
            else:
                print(f"❌ Failed to create test contract: {create_response.status_code}")
                print(f"   Response: {create_response.text}")
                return
        else:
            contract_id = contracts[0]["id"]
            print(f"✅ Using existing contract ID: {contract_id}")
        
        # Test PDF export endpoint
        pdf_export_url = f"http://localhost:8000/api/v1/contracts/{contract_id}/export/pdf"
        
        try:
            pdf_response = requests.get(pdf_export_url, headers=headers)
            
            if pdf_response.status_code == 503:
                print("❌ PDF export still returns 503 - dependencies issue not fully resolved")
                print(f"   Response: {pdf_response.text}")
            elif pdf_response.status_code == 200:
                print("✅ PDF export successful!")
                print(f"   Content-Type: {pdf_response.headers.get('content-type', 'unknown')}")
                print(f"   Content-Length: {len(pdf_response.content)} bytes")
                
                # Save the PDF for verification
                with open("/tmp/test_export.pdf", "wb") as f:
                    f.write(pdf_response.content)
                print("✅ PDF saved to /tmp/test_export.pdf")
                
            else:
                print(f"⚠️  PDF export returned status: {pdf_response.status_code}")
                print(f"   Response: {pdf_response.text}")
                
        except Exception as e:
            print(f"❌ PDF export request error: {e}")
            
    except Exception as e:
        print(f"❌ Contracts API error: {e}")

if __name__ == "__main__":
    test_pdf_export_availability()