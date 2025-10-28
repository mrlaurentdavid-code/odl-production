#!/bin/bash
# Deploy API Validation O!Deal to Server
# Usage: ./deploy-api-validation.sh

set -e

echo "🚀 Deploying API Validation O!Deal to Server..."

SERVER="root@31.97.193.159"
SSH_KEY="$HOME/.ssh/claude_temp_key"
LOCAL_PATH="/Users/laurentdavid/Desktop/odl-projects/odl-production/applications/odl-tools"
REMOTE_PATH="/opt/api-validation"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Step 1: Syncing files to server...${NC}"
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env.local' \
  --exclude '.vercel' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "$LOCAL_PATH/" "$SERVER:$REMOTE_PATH/"

echo -e "${YELLOW}🔧 Step 2: Rebuilding and restarting container...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" << 'EOF'
cd /root
set -a && source /root/.env.odl && set +a
docker-compose -f docker-compose.odl.yml build api-validation
docker-compose -f docker-compose.odl.yml up -d --force-recreate api-validation
EOF

echo -e "${GREEN}✅ API Validation deployed successfully!${NC}"
echo -e "${GREEN}🌐 API URL: https://api.odl-tools.ch/api/validate-item${NC}"
echo ""
echo -e "${YELLOW}📝 Test the API:${NC}"
echo "  GET  https://api.odl-tools.ch/api/validate-item  (Documentation)"
echo "  POST https://api.odl-tools.ch/api/validate-item  (Validation)"
