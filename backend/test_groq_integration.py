#!/usr/bin/env python3
"""
Test script to verify Groq AI integration is working correctly
"""

import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq
import json
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
load_dotenv()

class GroqIntegrationTester:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.temperature = float(os.getenv("GROQ_TEMPERATURE", "0.3"))
        self.max_tokens = int(os.getenv("GROQ_MAX_TOKENS", "4096"))
        
        if not self.api_key or self.api_key.startswith("gsk_REPLACE"):
            raise ValueError("❌ GROQ_API_KEY not set or invalid in .env file")
        
        self.client = Groq(api_key=self.api_key)
        print(f"✅ Groq client initialized with model: {self.model}")

    def test_basic_completion(self):
        """Test basic text completion"""
        print("\n🧪 Testing basic completion...")
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": "Say 'Hello, Pactoria!' and nothing else."}
                ],
                temperature=0,
                max_tokens=50
            )
            result = response.choices[0].message.content
            print(f"✅ Basic completion successful: {result}")
            return True
        except Exception as e:
            print(f"❌ Basic completion failed: {e}")
            return False

    def test_contract_generation(self):
        """Test contract generation capability"""
        print("\n🧪 Testing contract generation...")
        try:
            prompt = """
            Generate a simple service agreement outline with the following sections:
            1. Parties
            2. Services
            3. Payment Terms
            4. Confidentiality
            5. Termination
            
            Keep it brief, just the section headers and one sentence for each.
            """
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a legal contract assistant specializing in UK law."},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=500
            )
            result = response.choices[0].message.content
            print("✅ Contract generation successful!")
            print("📄 Generated content preview:")
            print("-" * 50)
            print(result[:500] + "..." if len(result) > 500 else result)
            print("-" * 50)
            return True
        except Exception as e:
            print(f"❌ Contract generation failed: {e}")
            return False

    def test_compliance_analysis(self):
        """Test compliance analysis capability"""
        print("\n🧪 Testing compliance analysis...")
        try:
            contract_text = """
            This agreement is between Company A and Company B.
            Company A will provide software development services.
            Payment will be made within 30 days.
            Both parties agree to keep information confidential.
            """
            
            prompt = f"""
            Analyze this contract for UK law compliance and identify any missing essential elements:
            
            {contract_text}
            
            Provide a brief analysis with:
            1. Compliance score (0-100)
            2. Missing elements
            3. One key recommendation
            """
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a UK legal compliance expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=300
            )
            result = response.choices[0].message.content
            print("✅ Compliance analysis successful!")
            print("📊 Analysis result:")
            print("-" * 50)
            print(result)
            print("-" * 50)
            return True
        except Exception as e:
            print(f"❌ Compliance analysis failed: {e}")
            return False

    def test_streaming_response(self):
        """Test streaming capability for real-time generation"""
        print("\n🧪 Testing streaming response...")
        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": "List 3 key elements of a valid UK contract."}
                ],
                temperature=self.temperature,
                max_tokens=200,
                stream=True
            )
            
            print("✅ Streaming response:")
            print("-" * 50)
            full_response = ""
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    print(content, end="", flush=True)
                    full_response += content
            print("\n" + "-" * 50)
            return True
        except Exception as e:
            print(f"❌ Streaming response failed: {e}")
            return False

    def test_rate_limits(self):
        """Test API rate limits and response time"""
        print("\n🧪 Testing rate limits and performance...")
        try:
            start_time = datetime.now()
            requests = []
            
            # Make 3 quick requests
            for i in range(3):
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "user", "content": f"Say 'Test {i+1}' and nothing else."}
                    ],
                    temperature=0,
                    max_tokens=10
                )
                requests.append(response.choices[0].message.content)
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            print(f"✅ Completed 3 requests in {duration:.2f} seconds")
            print(f"   Average response time: {duration/3:.2f} seconds per request")
            print(f"   Responses: {requests}")
            return True
        except Exception as e:
            print(f"❌ Rate limit test failed: {e}")
            return False

    def run_all_tests(self):
        """Run all integration tests"""
        print("=" * 60)
        print("🚀 Starting Groq AI Integration Tests")
        print("=" * 60)
        print(f"📍 API Key: [CONFIGURED]")
        print(f"🤖 Model: {self.model}")
        print(f"🌡️  Temperature: {self.temperature}")
        print(f"📝 Max Tokens: {self.max_tokens}")
        print("=" * 60)
        
        tests = [
            ("Basic Completion", self.test_basic_completion),
            ("Contract Generation", self.test_contract_generation),
            ("Compliance Analysis", self.test_compliance_analysis),
            ("Streaming Response", self.test_streaming_response),
            ("Rate Limits", self.test_rate_limits)
        ]
        
        results = []
        for test_name, test_func in tests:
            try:
                success = test_func()
                results.append((test_name, success))
            except Exception as e:
                print(f"❌ Test '{test_name}' crashed: {e}")
                results.append((test_name, False))
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 Test Summary")
        print("=" * 60)
        passed = sum(1 for _, success in results if success)
        total = len(results)
        
        for test_name, success in results:
            status = "✅ PASSED" if success else "❌ FAILED"
            print(f"{status}: {test_name}")
        
        print("-" * 60)
        print(f"📈 Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Groq AI integration is working perfectly!")
        else:
            print("⚠️  Some tests failed. Please check the configuration.")
        
        return passed == total

def main():
    """Main entry point"""
    try:
        tester = GroqIntegrationTester()
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
