# Dockerfile pour TAR Calculator (Express + Anthropic)
FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
RUN npm ci --only=production

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 3000

# Variables d'environnement (overridées par docker-compose)
ENV NODE_ENV=production
ENV PORT=3000

# Démarrer le serveur
CMD ["npm", "start"]
