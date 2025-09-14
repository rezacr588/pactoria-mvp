#!/usr/bin/env python3
"""
Complete AI Investigation with Frontend Integration Test
======================================================

This script provides a comprehensive investigation of the AI functionality
including frontend integration and user experience simulation.
"""

import requests
import json
import time
from datetime import datetime
import sys

BACKEND_URL = "http://localhost:8000/api/v1"
FRONTEND_URL = "http://localhost:5173"

def log(message, level="INFO"):
    """Enhanced logging with emojis and formatting"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    icons = {
        "INFO": "ℹ️",
        "TEST": "🧪", 
        "SUCCESS": "✅",
        "ERROR": "❌",
        "WARNING": "⚠️",
        "FINDING": "🔍"
    }
    icon = icons.get(level, "📝")
    print(f"[{timestamp}] {icon} {message}")

def test_service_health():
    """Test all service endpoints"""
    log("Testing Service Health Status", "TEST")
    
    results = {}
    
    # Test backend health
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        results['backend'] = {
            'status': response.status_code,
            'data': response.json() if response.status_code == 200 else None
        }
        log(f"Backend Health: {response.status_code}", "SUCCESS" if response.status_code == 200 else "ERROR")
    except Exception as e:
        results['backend'] = {'status': 'error', 'error': str(e)}
        log(f"Backend Health: Connection failed - {e}", "ERROR")
    
    # Test AI service health
    try:
        response = requests.get(f"{BACKEND_URL}/ai/health", timeout=5)
        results['ai'] = {
            'status': response.status_code,
            'data': response.json() if response.status_code == 200 else None
        }
        if response.status_code == 200:
            data = response.json()
            log(f"AI Status: {data.get('status')} | Model: {data.get('model')}", "SUCCESS")
        else:
            log(f"AI Health: {response.status_code}", "ERROR")
    except Exception as e:
        results['ai'] = {'status': 'error', 'error': str(e)}
        log(f"AI Health: Connection failed - {e}", "ERROR")
    
    # Test frontend accessibility
    try:
        response = requests.get(FRONTEND_URL, timeout=5)
        results['frontend'] = {'status': response.status_code}
        log(f"Frontend: {response.status_code}", "SUCCESS" if response.status_code == 200 else "ERROR")
    except Exception as e:
        results['frontend'] = {'status': 'error', 'error': str(e)}
        log(f"Frontend: Connection failed - {e}", "ERROR")
    
    return results

def simulate_user_workflow():
    """Simulate complete user workflow for contract generation"""
    log("Simulating Complete User Workflow", "TEST")
    
    workflow_results = {}
    
    # Step 1: User Registration
    log("Step 1: User Registration", "TEST")
    user_data = {
        "email": f"workflow-test-{int(time.time())}@pactoria.com",
        "password": "TestPassword123!",
        "full_name": "Workflow Test User",
        "company_name": "Workflow Test Company"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/register", json=user_data, timeout=10)
        if response.status_code in [200, 201]:
            token_data = response.json()
            token = token_data["token"]["access_token"]
            workflow_results['registration'] = {'success': True, 'token': token}
            log("User registration successful", "SUCCESS")
        else:
            workflow_results['registration'] = {'success': False, 'error': response.text}
            log(f"Registration failed: {response.status_code}", "ERROR")
            return workflow_results
    except Exception as e:
        workflow_results['registration'] = {'success': False, 'error': str(e)}
        log(f"Registration error: {e}", "ERROR")
        return workflow_results
    
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Step 2: Browse Templates (simulating user selecting a template)
    log("Step 2: Browse Available Templates", "TEST")
    try:
        response = requests.get(f"{BACKEND_URL}/templates/", headers=headers, timeout=10)
        if response.status_code == 200:
            templates = response.json().get('templates', [])
            workflow_results['templates'] = {'success': True, 'count': len(templates)}
            log(f"Found {len(templates)} templates available", "SUCCESS")
        else:
            workflow_results['templates'] = {'success': False, 'error': response.text}
            log(f"Template browsing failed: {response.status_code}", "ERROR")
    except Exception as e:
        workflow_results['templates'] = {'success': False, 'error': str(e)}
        log(f"Template browsing error: {e}", "ERROR")
    
    # Step 3: Create Contract
    log("Step 3: Create New Contract", "TEST")
    contract_data = {
        "title": "Comprehensive AI Test Contract",
        "contract_type": "service_agreement",
        "plain_english_input": (
            "I need a professional service agreement for a complex software development project. "
            "The project involves building a full-stack web application with React frontend, "
            "Python FastAPI backend, PostgreSQL database, and AI integration features. "
            "The total project value is £25,000 with payment in 5 monthly installments. "
            "The project duration is 6 months starting March 2025. "
            "Include comprehensive intellectual property clauses, strict confidentiality agreements, "
            "detailed liability limitations, progressive termination clauses, and full UK GDPR "
            "compliance requirements. The client is InnovaTech Solutions Ltd and the service "
            "provider is Elite Development Partners UK. Include force majeure clauses, "
            "detailed deliverable specifications, and performance milestones."
        ),
        "client_name": "InnovaTech Solutions Ltd",
        "supplier_name": "Elite Development Partners UK",
        "contract_value": 25000,
        "currency": "GBP"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/contracts/", json=contract_data, headers=headers, timeout=10)
        if response.status_code in [200, 201]:
            contract = response.json()
            contract_id = contract['id']
            workflow_results['contract_creation'] = {'success': True, 'contract_id': contract_id}
            log(f"Contract created successfully: {contract_id}", "SUCCESS")
        else:
            workflow_results['contract_creation'] = {'success': False, 'error': response.text}
            log(f"Contract creation failed: {response.status_code}", "ERROR")
            return workflow_results
    except Exception as e:
        workflow_results['contract_creation'] = {'success': False, 'error': str(e)}
        log(f"Contract creation error: {e}", "ERROR")
        return workflow_results
    
    # Step 4: AI Generation Attempt (The Critical Test!)
    log("Step 4: AI Contract Generation (CRITICAL TEST)", "TEST")
    generation_data = {"regenerate": False}
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{BACKEND_URL}/contracts/{contract_id}/generate", 
            json=generation_data, 
            headers=headers, 
            timeout=45  # Longer timeout for AI generation
        )
        processing_time = time.time() - start_time
        
        if response.status_code == 200:
            ai_result = response.json()
            content_length = len(ai_result.get('content', ''))
            workflow_results['ai_generation'] = {
                'success': True,
                'processing_time': processing_time,
                'content_length': content_length,
                'model': ai_result.get('model_name'),
                'token_usage': ai_result.get('token_usage'),
                'confidence': ai_result.get('confidence_score')
            }
            log(f"AI Generation SUCCESS! Content: {content_length} chars, Time: {processing_time:.2f}s", "SUCCESS")
        else:
            error_detail = response.json().get('detail', 'Unknown error')
            workflow_results['ai_generation'] = {
                'success': False,
                'error': error_detail,
                'processing_time': processing_time,
                'status_code': response.status_code
            }
            log(f"AI Generation FAILED: {error_detail}", "ERROR")
    except Exception as e:
        workflow_results['ai_generation'] = {'success': False, 'error': str(e)}
        log(f"AI Generation error: {e}", "ERROR")
    
    # Step 5: Contract Retrieval (Check if contract was updated)
    log("Step 5: Verify Contract Content", "TEST")
    try:
        response = requests.get(f"{BACKEND_URL}/contracts/{contract_id}", headers=headers, timeout=10)
        if response.status_code == 200:
            contract = response.json()
            generated_content = contract.get('generated_content')
            final_content = contract.get('final_content')
            
            workflow_results['contract_retrieval'] = {
                'success': True,
                'has_generated_content': bool(generated_content),
                'has_final_content': bool(final_content),
                'generated_length': len(generated_content) if generated_content else 0,
                'status': contract.get('status')
            }
            
            if generated_content:
                log(f"Contract has generated content: {len(generated_content)} characters", "SUCCESS")
            else:
                log("Contract has NO generated content", "WARNING")
        else:
            workflow_results['contract_retrieval'] = {'success': False, 'error': response.text}
            log(f"Contract retrieval failed: {response.status_code}", "ERROR")
    except Exception as e:
        workflow_results['contract_retrieval'] = {'success': False, 'error': str(e)}
        log(f"Contract retrieval error: {e}", "ERROR")
    
    return workflow_results

def main():
    """Main investigation function"""
    print("=" * 80)
    print("🚀 COMPLETE AI CONTRACT GENERATION INVESTIGATION")
    print("=" * 80)
    print(f"🌐 Backend URL: {BACKEND_URL}")
    print(f"🖥️  Frontend URL: {FRONTEND_URL}")
    print(f"🕐 Investigation Time: {datetime.now().isoformat()}")
    print("=" * 80)
    
    # Phase 1: Service Health Check
    log("PHASE 1: Service Health Assessment", "TEST")
    health_results = test_service_health()
    
    print()
    
    # Phase 2: Complete User Workflow
    log("PHASE 2: Complete User Workflow Simulation", "TEST")
    workflow_results = simulate_user_workflow()
    
    print()
    print("=" * 80)
    print("📊 COMPREHENSIVE INVESTIGATION RESULTS")
    print("=" * 80)
    
    # Service Status Summary
    backend_ok = health_results.get('backend', {}).get('status') == 200
    ai_health_ok = health_results.get('ai', {}).get('status') == 200
    frontend_ok = health_results.get('frontend', {}).get('status') == 200
    
    print(f"Backend Service: {'✅ Online' if backend_ok else '❌ Offline'}")
    print(f"Frontend Service: {'✅ Online' if frontend_ok else '❌ Offline'}")
    print(f"AI Health Check: {'✅ Healthy' if ai_health_ok else '❌ Unhealthy'}")
    
    # AI Status Details
    if ai_health_ok:
        ai_data = health_results['ai']['data']
        print(f"AI Model: {ai_data.get('model', 'Unknown')}")
        print(f"AI Features: {', '.join(ai_data.get('features', []))}")
    
    print()
    
    # Workflow Results
    print("🔄 USER WORKFLOW RESULTS:")
    reg_success = workflow_results.get('registration', {}).get('success', False)
    contract_success = workflow_results.get('contract_creation', {}).get('success', False)
    ai_success = workflow_results.get('ai_generation', {}).get('success', False)
    
    print(f"User Registration: {'✅ Success' if reg_success else '❌ Failed'}")
    print(f"Contract Creation: {'✅ Success' if contract_success else '❌ Failed'}")
    print(f"AI Generation: {'✅ Success' if ai_success else '❌ Failed'}")
    
    # AI Generation Details
    if 'ai_generation' in workflow_results:
        ai_result = workflow_results['ai_generation']
        if ai_result['success']:
            print(f"Generated Content: {ai_result.get('content_length', 0)} characters")
            print(f"Processing Time: {ai_result.get('processing_time', 0):.2f} seconds")
            print(f"AI Model: {ai_result.get('model', 'Unknown')}")
            print(f"Token Usage: {ai_result.get('token_usage', 'N/A')}")
        else:
            print(f"AI Error: {ai_result.get('error', 'Unknown')}")
    
    print()
    print("=" * 80)
    print("🎯 FINAL CONCLUSION")
    print("=" * 80)
    
    if ai_success:
        print("✅ CONFIRMED: AI IS WORKING AND GENERATING CONTRACTS")
        print("   • Real AI-powered content generation is functional")
        print("   • Groq API integration is properly configured")
        print("   • Users can successfully generate contract content")
        print("   • System is production-ready for AI features")
    elif ai_health_ok and not ai_success:
        print("❌ CONFIRMED: AI HEALTH CHECK IS MISLEADING")
        print("   • AI service reports 'healthy' but cannot generate content")
        print("   • Groq API key is invalid or API is unreachable")
        print("   • Users will experience failure after being promised AI features")
        print("   • System needs proper error handling and honest status reporting")
    else:
        print("❌ CONFIRMED: AI SERVICE IS COMPLETELY NON-FUNCTIONAL")
        print("   • AI service is not initialized or configured")
        print("   • No AI features available to users")
        print("   • System should disable AI features or show proper error states")
    
    print()
    print("🛠️  RECOMMENDATIONS:")
    if not ai_success:
        print("   1. Configure valid Groq API key in environment variables")
        print("   2. Fix AI health check to validate actual API connectivity")
        print("   3. Implement graceful degradation when AI is unavailable")
        print("   4. Add clear user messaging about AI feature availability")
        print("   5. Consider fallback to template-based generation")
    else:
        print("   1. Monitor AI service performance and error rates")
        print("   2. Implement usage analytics and cost tracking")
        print("   3. Add AI generation progress indicators in UI")
        print("   4. Consider caching frequently generated contract types")
    
    print("=" * 80)

if __name__ == "__main__":
    main()