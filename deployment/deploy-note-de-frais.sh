#!/bin/bash
# Deploy Notes de Frais to Server
# Usage: ./deploy-note-de-frais.sh

set -e

echo "🚀 Deploying Notes de Frais to Server..."

SERVER="root@31.97.193.159"
SSH_KEY="$HOME/.ssh/claude_temp_key"
LOCAL_PATH="/Users/laurentdavid/Desktop/odl-projects/note-de-frais"
REMOTE_PATH="/opt/note-de-frais"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Step 1: Syncing files to server...${NC}"
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env.local' \
  --exclude 'DEPLOY_API.md' \
  --exclude 'docker-compose-api.yml' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "$LOCAL_PATH/" "$SERVER:$REMOTE_PATH/"

echo -e "${YELLOW}🔧 Step 2: Installing dependencies for API...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" << 'EOF'
cd /opt/note-de-frais
npm install --production
EOF

echo -e "${YELLOW}🔄 Step 3: Rebuilding and restarting containers...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" << 'EOF'
cd /root
set -a && source /root/.env.odl && set +a
docker-compose -f docker-compose.odl.yml build ndf ndf-api
docker-compose -f docker-compose.odl.yml up -d --force-recreate ndf ndf-api
EOF

echo -e "${GREEN}✅ Notes de Frais deployed successfully!${NC}"
echo -e "${GREEN}🌐 Frontend: https://ndf.odl-tools.ch${NC}"
echo -e "${GREEN}🌐 API: https://ndf-api.odl-tools.ch/health${NC}"
