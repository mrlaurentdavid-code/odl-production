#!/bin/bash

# ===================================
# Script de déploiement TAR Calculator
# ===================================

echo "🚀 Démarrage du déploiement TAR Calculator API"
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérification que le script est exécuté en tant que root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}❌ Ce script doit être exécuté en tant que root${NC}"
  exit 1
fi

# 1. Créer le dossier de l'application
echo -e "${YELLOW}📁 Création du dossier /opt/tar-calculator...${NC}"
mkdir -p /opt/tar-calculator
cd /opt/tar-calculator

# 2. Copier les fichiers (à faire manuellement avant d'exécuter ce script)
echo -e "${YELLOW}📦 Vérification des fichiers...${NC}"
if [ ! -f "server.js" ] || [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: server.js ou package.json manquant${NC}"
    echo "Assurez-vous d'avoir copié tous les fichiers dans /opt/tar-calculator"
    exit 1
fi

# 3. Vérifier que .env existe
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Erreur: fichier .env manquant${NC}"
    echo "Créez un fichier .env avec votre clé OpenAI"
    exit 1
fi

# 4. Installer les dépendances Node.js
echo -e "${YELLOW}📦 Installation des dépendances npm...${NC}"
npm install --production

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de l'installation des dépendances${NC}"
    exit 1
fi

# 5. Copier le service systemd
echo -e "${YELLOW}⚙️  Configuration du service systemd...${NC}"
cp tar-calculator.service /etc/systemd/system/

# 6. Recharger systemd
systemctl daemon-reload

# 7. Activer et démarrer le service
echo -e "${YELLOW}🔄 Activation et démarrage du service...${NC}"
systemctl enable tar-calculator
systemctl restart tar-calculator

# 8. Vérifier le statut
sleep 2
if systemctl is-active --quiet tar-calculator; then
    echo -e "${GREEN}✅ Service TAR Calculator démarré avec succès!${NC}"
else
    echo -e "${RED}❌ Erreur lors du démarrage du service${NC}"
    echo "Logs d'erreur:"
    journalctl -u tar-calculator -n 20 --no-pager
    exit 1
fi

# 9. Configurer Traefik (mise à jour docker-compose.yml)
echo ""
echo -e "${YELLOW}🌐 Configuration de Traefik pour tar-api.odeal.ch...${NC}"
echo ""
echo "Pour exposer l'API via Traefik, ajoutez ce service au fichier /root/docker-compose.yml:"
echo ""
cat << 'EOF'
  tar-api:
    image: alpine/socat
    restart: always
    command: tcp-listen:3000,fork,reuseaddr tcp-connect:host.docker.internal:3000
    extra_hosts:
      - "host.docker.internal:host-gateway"
    labels:
      - traefik.enable=true
      - traefik.http.routers.tarapi.rule=Host(`tar-api.odeal.ch`)
      - traefik.http.routers.tarapi.tls=true
      - traefik.http.routers.tarapi.entrypoints=web,websecure
      - traefik.http.routers.tarapi.tls.certresolver=mytlschallenge
      - traefik.http.services.tarapi.loadbalancer.server.port=3000
EOF
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Ajoutez cette section manuellement puis exécutez:${NC}"
echo -e "   ${GREEN}cd /root && docker compose up -d${NC}"
echo ""
echo -e "${GREEN}✅ Déploiement terminé!${NC}"
echo ""
echo "🔍 Commandes utiles:"
echo "   - Voir les logs: journalctl -u tar-calculator -f"
echo "   - Statut: systemctl status tar-calculator"
echo "   - Redémarrer: systemctl restart tar-calculator"
echo "   - Tester l'API: curl http://localhost:3000/health"
