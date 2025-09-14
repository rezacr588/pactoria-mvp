#!/bin/bash

# Pactoria Contract Generation Test
echo "🧪 Testing Contract Generation..."

# Configuration
API_URL="http://localhost:8000"
CONTRACT_ID="010b14f6-03ac-4a40-9bce-c7c20505fc1a"

echo ""
echo "1. 🔑 Getting authentication token..."
AUTH_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@pactoria.com", "password": "Demo123!"}')

if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to backend. Make sure it's running on port 8000."
    echo "   Run: cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
    exit 1
fi

TOKEN=$(echo $AUTH_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ Authentication failed. Response:"
    echo "$AUTH_RESPONSE"
    exit 1
fi

echo "✅ Authentication successful"

echo ""
echo "2. 📄 Checking contract before generation..."
curl -s -X GET "$API_URL/api/v1/contracts/$CONTRACT_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null | grep -E "(generated_content|ai_generation_id)" || echo "Contract not found"

echo ""
echo "3. 🤖 Triggering AI contract generation..."
GENERATION_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/contracts/$CONTRACT_ID/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"regenerate": false}')

echo "Generation Response:"
echo "$GENERATION_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$GENERATION_RESPONSE"

echo ""
echo "4. 📄 Checking contract after generation..."
curl -s -X GET "$API_URL/api/v1/contracts/$CONTRACT_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null | grep -E "(generated_content|ai_generation_id)" || echo "Contract check failed"

echo ""
echo "✅ Test completed! Contract should now have generated content."