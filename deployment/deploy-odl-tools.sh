#!/bin/bash
# Deploy ODL Tools to Server
# Usage: ./deploy-odl-tools.sh

set -e

echo "🚀 Deploying ODL Tools to Server..."

SERVER="root@31.97.193.159"
SSH_KEY="$HOME/.ssh/claude_temp_key"
LOCAL_PATH="/Users/laurentdavid/Desktop/App ODL-Tools/odl-production/applications/odl-tools"
REMOTE_PATH="/opt/odl-tools"

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
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "$LOCAL_PATH/" "$SERVER:$REMOTE_PATH/"

echo -e "${YELLOW}🔧 Step 2: Rebuilding and restarting container...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" << 'EOF'
cd /root
set -a && source /root/.env.odl && set +a
docker-compose -f docker-compose.odl.yml build odl-tools-app
docker-compose -f docker-compose.odl.yml up -d --force-recreate odl-tools-app
EOF

echo -e "${GREEN}✅ ODL Tools deployed successfully!${NC}"
echo -e "${GREEN}🌐 Visit: https://app.odl-tools.ch${NC}"
