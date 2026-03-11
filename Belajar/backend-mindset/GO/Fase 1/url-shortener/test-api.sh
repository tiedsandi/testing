#!/bin/bash

echo "🧪 Testing URL Shortener API"
echo ""

BASE_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Health Check${NC}"
curl -s "$BASE_URL/health" | jq
echo ""

echo -e "${BLUE}2. Create Short URL for Google${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/urls" \
  -H "Content-Type: application/json" \
  -d '{"original_url": "https://www.google.com"}')
echo $RESPONSE | jq
SHORT_CODE=$(echo $RESPONSE | jq -r '.data.short_code')
URL_ID=$(echo $RESPONSE | jq -r '.data.id')
echo ""

echo -e "${BLUE}3. Create Short URL for GitHub${NC}"
curl -s -X POST "$BASE_URL/api/urls" \
  -H "Content-Type: application/json" \
  -d '{"original_url": "https://github.com"}' | jq
echo ""

echo -e "${BLUE}4. Get All URLs${NC}"
curl -s "$BASE_URL/api/urls" | jq
echo ""

echo -e "${BLUE}5. Get URL by ID${NC}"
curl -s "$BASE_URL/api/urls/$URL_ID" | jq
echo ""

echo -e "${BLUE}6. Test Redirect (short code: $SHORT_CODE)${NC}"
echo "Testing redirect to: $BASE_URL/r/$SHORT_CODE"
curl -sL -w "\nHTTP Status: %{http_code}\n" "$BASE_URL/r/$SHORT_CODE" -o /dev/null
echo ""

echo -e "${BLUE}7. Check Click Count${NC}"
curl -s "$BASE_URL/api/urls/$URL_ID" | jq '.data.click_count'
echo ""

echo -e "${BLUE}8. Update URL - Set Inactive${NC}"
curl -s -X PUT "$BASE_URL/api/urls/$URL_ID" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}' | jq
echo ""

echo -e "${BLUE}9. Try Redirect on Inactive URL${NC}"
curl -s "$BASE_URL/r/$SHORT_CODE" | jq
echo ""

echo -e "${GREEN}✅ All tests completed!${NC}"
