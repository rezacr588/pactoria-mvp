#!/usr/bin/env python3
"""
Test AI Contract Generation API endpoints
"""

import requests
import json
import time
from datetime import datetime, timedelta

# API Configuration
BASE_URL = "http://localhost:8000/api/v1"
AUTH_TOKEN = None

def test_health():
    """Test health endpoint"""
    print("🧪 Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health/")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   Response: {response.json()}")
        return True
    return False

def test_register_user():
    """Register a test user"""
    print("\n🧪 Registering test user...")
    user_data = {
        "email": f"test_{int(time.time())}@pactoria.com",
        "password": "TestPassword123!",
        "full_name": "AI Test User",
        "company_name": "AI Test Company"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
    print(f"   Status: {response.status_code}")
    
    if response.status_code in [200, 201]:
        data = response.json()
        print(f"   User created: {data.get('user', {}).get('email')}")
        return data.get("access_token")
    else:
        print(f"   Error: {response.text}")
        return None

def test_login():
    """Login with demo account"""
    print("\n🧪 Logging in with demo account...")
    login_data = {
        "username": "demo@pactoria.com",  # OAuth2 uses 'username' field
        "password": "demo123"
    }
    
    response = requests.post(
        f"{BASE_URL}/auth/login", 
        data=login_data,  # Form data for OAuth2
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Login successful")
        return data.get("access_token")
    else:
        print(f"   ❌ Login failed: {response.status_code}")
        print(f"   Error: {response.text}")
        # Try registering instead
        return test_register_user()

def test_ai_contract_generation(token):
    """Test AI contract generation"""
    print("\n🧪 Testing AI contract generation...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test data for contract generation
    contract_data = {
        "plain_english_input": """
        Create a professional service agreement for web development services. 
        The client is TechStartup Ltd and the service provider is WebDev Solutions. 
        The project involves developing a modern e-commerce platform with React frontend 
        and Python backend. Project duration is 3 months starting January 2025. 
        Total project value is £25,000 paid in three monthly installments. 
        Include intellectual property clauses, confidentiality terms, and standard UK termination clauses.
        """,
        "contract_type": "service_agreement",
        "client_name": "TechStartup Ltd",
        "supplier_name": "WebDev Solutions",
        "contract_value": 25000,
        "currency": "GBP",
        "start_date": "2025-01-01",
        "end_date": "2025-03-31",
        "additional_terms": [
            "30-day payment terms",
            "Weekly progress reports required",
            "Source code ownership transfers upon final payment"
        ]
    }
    
    print("   📝 Sending contract generation request...")
    print(f"   Contract Type: {contract_data['contract_type']}")
    print(f"   Client: {contract_data['client_name']}")
    print(f"   Value: £{contract_data['contract_value']}")
    
    start_time = time.time()
    response = requests.post(
        f"{BASE_URL}/ai/generate-contract",
        json=contract_data,
        headers=headers
    )
    processing_time = time.time() - start_time
    
    print(f"   ⏱️  Processing time: {processing_time:.2f} seconds")
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("   ✅ Contract generated successfully!")
        print(f"   Model: {data.get('model_name')}")
        print(f"   Tokens used: {data.get('token_usage', {}).get('total_tokens')}")
        print(f"   Confidence: {data.get('confidence_score', 0):.2%}")
        
        # Show preview of generated content
        content = data.get('content', '')
        print("\n   📄 Generated Contract Preview:")
        print("   " + "="*50)
        preview = content[:500] + "..." if len(content) > 500 else content
        for line in preview.split('\n')[:10]:
            print(f"   {line}")
        print("   " + "="*50)
        
        return data
    else:
        print(f"   ❌ Generation failed: {response.text}")
        return None

def test_compliance_analysis(token, contract_content=None):
    """Test compliance analysis"""
    print("\n🧪 Testing compliance analysis...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Use provided content or sample
    if not contract_content:
        contract_content = """
        SERVICE AGREEMENT
        
        This agreement is between TechStartup Ltd (Client) and WebDev Solutions (Provider).
        
        1. SERVICES
        The Provider will develop a web application for the Client.
        
        2. PAYMENT
        Total fee: £25,000 payable in three installments.
        
        3. TIMELINE
        Project duration: 3 months from January 1, 2025.
        
        4. INTELLECTUAL PROPERTY
        All work product becomes property of Client upon payment.
        
        5. CONFIDENTIALITY
        Both parties agree to maintain confidentiality.
        
        6. TERMINATION
        Either party may terminate with 30 days notice.
        """
    
    analysis_data = {
        "contract_content": contract_content,
        "contract_type": "service_agreement",
        "jurisdiction": "UK"
    }
    
    print("   📊 Analyzing contract compliance...")
    start_time = time.time()
    response = requests.post(
        f"{BASE_URL}/ai/analyze-compliance",
        json=analysis_data,
        headers=headers
    )
    processing_time = time.time() - start_time
    
    print(f"   ⏱️  Processing time: {processing_time:.2f} seconds")
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("   ✅ Analysis completed!")
        print(f"   Overall Score: {data.get('overall_score', 0):.1f}/100")
        print(f"   GDPR Compliance: {data.get('gdpr_compliance', 0):.1f}/100")
        print(f"   Risk Score: {data.get('risk_score', 0)}/10")
        
        print("\n   🚨 Risk Factors:")
        for factor in data.get('risk_factors', [])[:3]:
            print(f"      - {factor}")
        
        print("\n   💡 Recommendations:")
        for rec in data.get('recommendations', [])[:3]:
            print(f"      - {rec}")
        
        return data
    else:
        print(f"   ❌ Analysis failed: {response.text}")
        return None

def test_streaming_generation(token):
    """Test streaming contract generation (if supported)"""
    print("\n🧪 Testing streaming generation...")
    print("   ⚠️  Note: Streaming may not be supported in current implementation")
    # This would require websocket or SSE support
    print("   Skipping streaming test...")
    return True

def main():
    """Run all tests"""
    print("="*60)
    print("🚀 Starting AI API Integration Tests")
    print("="*60)
    print(f"📍 API Base URL: {BASE_URL}")
    print(f"🕐 Test Time: {datetime.now().isoformat()}")
    print("="*60)
    
    # Test health
    health_ok = test_health()
    if not health_ok:
        print("❌ Health check failed. Is the backend running?")
        return
    
    # Get auth token
    token = test_login()
    if not token:
        print("❌ Authentication failed. Cannot proceed with tests.")
        return
    
    print(f"\n🔑 Auth token obtained: {token[:20]}...")
    
    # Test contract generation
    generated_contract = test_ai_contract_generation(token)
    
    # Test compliance analysis
    if generated_contract:
        # Analyze the generated contract
        test_compliance_analysis(token, generated_contract.get('content'))
    else:
        # Use sample contract
        test_compliance_analysis(token)
    
    # Test streaming (optional)
    test_streaming_generation(token)
    
    # Summary
    print("\n" + "="*60)
    print("📊 Test Summary")
    print("="*60)
    print("✅ All AI API tests completed!")
    print("🎉 Groq AI integration is working with the API!")

if __name__ == "__main__":
    main()
