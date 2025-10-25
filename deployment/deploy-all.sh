#!/bin/bash
# Deploy ALL ODL Tools Applications to Server
# Usage: ./deploy-all.sh

set -e

echo "🚀 Deploying ALL ODL Tools Applications to Server..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  ODL TOOLS - FULL DEPLOYMENT${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Deploy ODL Tools Dashboard
echo -e "${YELLOW}[1/3] Deploying ODL Tools Dashboard...${NC}"
bash "$SCRIPT_DIR/deploy-odl-tools.sh"
echo ""

# Deploy Notes de Frais
echo -e "${YELLOW}[2/3] Deploying Notes de Frais...${NC}"
bash "$SCRIPT_DIR/deploy-note-de-frais.sh"
echo ""

# Deploy TAR Calculator
echo -e "${YELLOW}[3/3] Deploying TAR Calculator...${NC}"
bash "$SCRIPT_DIR/deploy-tar-calculator.sh"
echo ""

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ ALL APPLICATIONS DEPLOYED!${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}🌐 Your applications:${NC}"
echo -e "   • Dashboard: ${GREEN}https://app.odl-tools.ch${NC}"
echo -e "   • Notes de Frais: ${GREEN}https://ndf.odl-tools.ch${NC}"
echo -e "   • TAR Calculator: ${GREEN}https://tar.odl-tools.ch${NC}"
echo ""
