#!/usr/bin/env python3
"""
AI Contract Generation Investigation Script
==========================================

This script investigates whether AI actually generates contracts in the Pactoria MVP.
It tests various scenarios and provides detailed findings.
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

def log(message, level="INFO"):
    """Log a message with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def test_ai_health():
    """Test AI service health endpoint"""
    log("Testing AI Health Endpoint", "TEST")
    try:
        response = requests.get(f"{BASE_URL}/ai/health", timeout=10)
        data = response.json()
        
        print(f"  Status Code: {response.status_code}")
        print(f"  AI Status: {data.get('status')}")
        print(f"  Model: {data.get('model')}")
        print(f"  Features: {data.get('features', [])}")
        
        return data
    except Exception as e:
        log(f"AI health check failed: {e}", "ERROR")
        return None

def register_test_user():
    """Register a test user for authentication"""
    log("Registering Test User", "TEST")
    user_data = {
        "email": f"ai-test-{int(time.time())}@pactoria.com",
        "password": "TestPassword123!",
        "full_name": "AI Investigation User",
        "company_name": "AI Test Company"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=user_data, timeout=10)
        if response.status_code in [200, 201]:
            data = response.json()
            token = data["token"]["access_token"]
            user_email = data["user"]["email"]
            log(f"User registered successfully: {user_email}")
            return token
        else:
            log(f"Registration failed: {response.status_code} - {response.text}", "ERROR")
            return None
    except Exception as e:
        log(f"Registration error: {e}", "ERROR")
        return None

def create_test_contract(token):
    """Create a test contract for AI generation"""
    log("Creating Test Contract", "TEST")
    
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    contract_data = {
        "title": "AI Investigation Test Contract",
        "contract_type": "service_agreement",
        "plain_english_input": (
            "I need a comprehensive service agreement for software development services. "
            "The project involves building a modern web application with React frontend "
            "and Python FastAPI backend. The total project value is £15,000 paid in "
            "three monthly installments of £5,000 each. The project duration is 3 months "
            "starting February 2025. Include intellectual property ownership clauses, "
            "confidentiality agreements, liability limitations, termination clauses, "
            "and UK GDPR compliance requirements. The client is TechCorp Ltd and the "
            "service provider is DevSolutions UK."
        ),
        "client_name": "TechCorp Ltd",
        "supplier_name": "DevSolutions UK",
        "contract_value": 15000,
        "currency": "GBP"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/contracts/", json=contract_data, headers=headers, timeout=10)
        if response.status_code in [200, 201]:
            contract = response.json()
            log(f"Contract created successfully: {contract['id']}")
            return contract
        else:
            log(f"Contract creation failed: {response.status_code} - {response.text}", "ERROR")
            return None
    except Exception as e:
        log(f"Contract creation error: {e}", "ERROR")
        return None

def test_ai_generation(token, contract_id):
    """Test AI contract generation"""
    log("Testing AI Contract Generation", "TEST")
    
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    generation_data = {"regenerate": False}
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/contracts/{contract_id}/generate", 
            json=generation_data, 
            headers=headers, 
            timeout=30
        )
        processing_time = time.time() - start_time
        
        print(f"  Status Code: {response.status_code}")
        print(f"  Processing Time: {processing_time:.2f} seconds")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Generation successful!")
            print(f"  Model: {data.get('model_name')}")
            print(f"  Content Length: {len(data.get('content', ''))}")
            print(f"  Token Usage: {data.get('token_usage')}")
            print(f"  Confidence: {data.get('confidence_score', 0):.2%}")
            return data
        else:
            error_detail = response.json().get('detail', 'Unknown error')
            print(f"  ❌ Generation failed: {error_detail}")
            return None
            
    except Exception as e:
        log(f"AI generation error: {e}", "ERROR")
        return None

def test_ai_analysis(token):
    """Test AI contract analysis"""
    log("Testing AI Contract Analysis", "TEST")
    
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    analysis_data = {
        "contract_content": (
            "This Service Agreement is made between TechCorp Ltd (Client) and "
            "DevSolutions UK (Provider). The Provider agrees to develop a web "
            "application for £15,000. Payment terms are 30 days. The agreement "
            "is governed by English law."
        ),
        "contract_type": "service_agreement"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/ai/analyze-contract", 
            json=analysis_data, 
            headers=headers, 
            timeout=30
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Analysis successful!")
            print(f"  Compliance Score: {data.get('compliance_score', 0):.2%}")
            print(f"  Risk Score: {data.get('risk_score', 'N/A')}")
            return data
        else:
            error_detail = response.json().get('detail', 'Unknown error')
            print(f"  ❌ Analysis failed: {error_detail}")
            return None
            
    except Exception as e:
        log(f"AI analysis error: {e}", "ERROR")
        return None

def main():
    """Main investigation function"""
    print("=" * 70)
    print("🔍 AI CONTRACT GENERATION INVESTIGATION")
    print("=" * 70)
    print(f"📍 API Base URL: {BASE_URL}")
    print(f"🕐 Investigation Time: {datetime.now().isoformat()}")
    print("=" * 70)
    
    # Step 1: Check AI health
    ai_health = test_ai_health()
    
    # Step 2: Register user and get token
    token = register_test_user()
    if not token:
        log("Cannot proceed without authentication token", "ERROR")
        return
    
    # Step 3: Create test contract
    contract = create_test_contract(token)
    if not contract:
        log("Cannot proceed without test contract", "ERROR")
        return
    
    # Step 4: Test AI generation
    generation_result = test_ai_generation(token, contract["id"])
    
    # Step 5: Test AI analysis
    analysis_result = test_ai_analysis(token)
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 INVESTIGATION SUMMARY")
    print("=" * 70)
    
    print(f"AI Service Health: {ai_health.get('status') if ai_health else 'Unknown'}")
    print(f"AI Model: {ai_health.get('model') if ai_health else 'Unknown'}")
    print(f"Contract Generation: {'✅ SUCCESS' if generation_result else '❌ FAILED'}")
    print(f"Contract Analysis: {'✅ SUCCESS' if analysis_result else '❌ FAILED'}")
    
    if not generation_result and not analysis_result:
        print("\n🔍 CONCLUSION: AI is NOT actually generating contracts")
        print("   - Service reports 'healthy' but fails on actual generation")
        print("   - Connection errors suggest invalid/missing API key")
        print("   - System may be falling back to templates or mock responses")
    elif generation_result:
        print("\n✅ CONCLUSION: AI IS generating contracts successfully")
        print("   - Real content generation with token usage tracking")
        print("   - Valid API key and working Groq integration")
    else:
        print("\n⚠️  CONCLUSION: Mixed results - needs further investigation")

if __name__ == "__main__":
    main()