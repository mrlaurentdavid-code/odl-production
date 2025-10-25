#!/bin/bash
# Deploy TAR Calculator to Server
# Usage: ./deploy-tar-calculator.sh

set -e

echo "🚀 Deploying TAR Calculator to Server..."

SERVER="root@31.97.193.159"
SSH_KEY="$HOME/.ssh/claude_temp_key"
LOCAL_PATH="/Users/laurentdavid/Desktop/odl-projects/tar-calculator"
REMOTE_PATH="/opt/tar-calculator"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Step 1: Syncing files to server...${NC}"
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "$LOCAL_PATH/" "$SERVER:$REMOTE_PATH/"

echo -e "${YELLOW}🔄 Step 2: Rebuilding and restarting container...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" << 'EOF'
cd /root
set -a && source /root/.env.odl && set +a
docker-compose -f docker-compose.odl.yml build tar-calculator
docker-compose -f docker-compose.odl.yml up -d --force-recreate tar-calculator
EOF

echo -e "${GREEN}✅ TAR Calculator deployed successfully!${NC}"
echo -e "${GREEN}🌐 Visit: https://tar.odl-tools.ch${NC}"
