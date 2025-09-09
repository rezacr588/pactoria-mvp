#!/bin/bash

echo "Testing Pactoria API..."
echo "========================"

API_URL="https://pactoria-backend.ashyforest-7d7631da.eastus.azurecontainerapps.io"

echo ""
echo "1. Testing Health Endpoint:"
curl -s "$API_URL/health" | python -m json.tool || echo "Health check failed"

echo ""
echo "2. Testing OpenAPI Schema:"
curl -s "$API_URL/openapi.json" | head -20 || echo "OpenAPI schema not available"

echo ""
echo "3. Testing Docs Endpoint:"
curl -s -o /dev/null -w "Docs Status: %{http_code}\n" "$API_URL/docs"

echo ""
echo "If all tests pass, you can access:"
echo "📚 Swagger UI: $API_URL/docs"
echo "📚 ReDoc:      $API_URL/redoc"
echo "📚 OpenAPI:    $API_URL/openapi.json"
