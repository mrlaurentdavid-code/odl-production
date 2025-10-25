# CLAUDE.md - Notes de Frais

## 📌 Qu'est-ce que cette application ?

**Notes de Frais** (NDF) est une application de gestion des notes de frais avec extraction automatique des données depuis des photos de reçus.

- **URL Web**: https://ndf.odl-tools.ch (Interface HTML)
- **URL API**: https://ndf-api.odl-tools.ch (API Express)
- **Technologie**: HTML statique + Express API + Claude Vision
- **Base de données**: Supabase PostgreSQL
- **Ports**: 80 (Web) + 3002 (API)

## 🎯 Fonctionnalités

### Interface Web (Nginx Statique)
- Formulaire de saisie note de frais
- Upload de photo de reçu
- Liste des notes de frais
- Détail et modification
- Page admin

### API Express (Claude Vision)
- **POST /api/extract-receipt** - Extraction de données depuis photo
- Utilise Anthropic Claude Vision pour lire les reçus
- Stockage dans Supabase

## 🗂️ Structure du Code

```
note-de-frais/
├── index.html                  # Page d'accueil
├── login.html                  # Page de connexion
├── add-invoice.html            # Ajout note de frais
├── invoice-detail.html         # Détail note de frais
├── edit-invoice.html           # Édition note de frais
├── admin.html                  # Page admin
├── style.css                   # Styles CSS
├── app.js                      # JavaScript client
│
├── server.js                   # API Express (Claude Vision)
├── middleware-auth.js          # Middleware authentification
│
├── Dockerfile                  # Dockerfile pour web (Nginx)
├── Dockerfile.api              # Dockerfile pour API (Express)
├── nginx.conf                  # Configuration Nginx
│
└── SQL Scripts/
    ├── fix-user-roles.sql
    ├── fix-user-roles-v2.sql
    ├── fix-user-roles-v3.sql
    ├── setup-auto-profile-trigger.sql
    └── fix-missing-profiles.js
```

## 🐳 Architecture Docker

Cette application utilise **2 containers** :

### 1. Container Web (Nginx)
- **Port**: 80
- **Image**: nginx:alpine
- **Contenu**: Fichiers HTML/CSS/JS statiques
- **URL**: https://ndf.odl-tools.ch

### 2. Container API (Express)
- **Port**: 3002
- **Image**: node:20-alpine
- **Contenu**: API Express avec Claude Vision
- **URL**: https://ndf-api.odl-tools.ch

## 🔑 API Endpoints

### POST /api/extract-receipt

**Fonction**: Extraire les données d'un reçu depuis une photo

**Authentication**: Supabase Auth

**Input**:
```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA...",
  "user_id": "ff8782ab-8e69-44a4-be0a-91b1e6508f5d"
}
```

**Claude Vision Prompt**:
```
Analyse ce reçu et extrais les informations suivantes au format JSON:
- merchant (nom du commerçant)
- date (format YYYY-MM-DD)
- total_amount (montant total en CHF)
- category (catégorie: repas, transport, hébergement, fournitures, autre)
- items (liste des articles si visible)
```

**Output**:
```json
{
  "success": true,
  "data": {
    "merchant": "Restaurant Le Parc",
    "date": "2025-10-25",
    "total_amount": 45.80,
    "category": "repas",
    "items": [
      { "name": "Menu du jour", "price": 25.00 },
      { "name": "Boisson", "price": 5.80 },
      { "name": "Café", "price": 4.00 }
    ]
  }
}
```

## 🗄️ Tables Supabase

### expenses (notes de frais)

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  merchant TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT,
  receipt_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Catégories**:
- `repas` - Repas et restauration
- `transport` - Frais de transport
- `hébergement` - Hôtels et logement
- `fournitures` - Fournitures de bureau
- `autre` - Autres frais

**Statuts**:
- `pending` - En attente de validation
- `approved` - Approuvé
- `rejected` - Refusé

## 🔧 Configuration

### Variables d'Environnement (API)

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# Supabase
SUPABASE_URL=https://xewnzetqvrovqjcvwkus.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server
PORT=3002
NODE_ENV=production
```

### Nginx Configuration

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

## 🚀 Déploiement

### Docker Compose

Deux services dans `docker-compose.odl.yml`:

```yaml
# Service Web (Nginx)
ndf:
  build:
    context: /opt/note-de-frais
    dockerfile: Dockerfile
  container_name: ndf
  networks:
    - root_default
  labels:
    - "traefik.http.routers.ndf.rule=Host(`ndf.odl-tools.ch`)"

# Service API (Express)
ndf-api:
  build:
    context: /opt/note-de-frais
    dockerfile: Dockerfile.api
  container_name: ndf-api
  environment:
    - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    - SUPABASE_URL=${SUPABASE_URL}
    - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
  labels:
    - "traefik.http.routers.ndf-api.rule=Host(`ndf-api.odl-tools.ch`)"
```

### Script de Déploiement

```bash
../../deployment/deploy-note-de-frais.sh
```

## 🧪 Tests

### Test Local Web
```bash
# Ouvrir dans le navigateur
open index.html
```

### Test Local API
```bash
# Démarrer l'API
node server.js

# Tester l'extraction
curl -X POST http://localhost:3002/api/extract-receipt \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "data:image/jpeg;base64,...",
    "user_id": "ff8782ab-8e69-44a4-be0a-91b1e6508f5d"
  }'
```

## 📝 Pour Claude Code

### Points d'Attention

1. **2 Containers**: Ne pas oublier que c'est une architecture web/API séparée
2. **Claude Vision**: Coûte plus cher que Claude Text, optimiser les prompts
3. **Images**: Gestion de l'upload et stockage des reçus
4. **Authentification**: Intégration Supabase Auth côté client HTML

### Fichiers Critiques

- `server.js` - API Express avec Claude Vision
- `app.js` - JavaScript client (fetch API, upload images)
- `nginx.conf` - Configuration serveur web
- `Dockerfile` vs `Dockerfile.api` - Deux images différentes

### Évolution

**Scripts SQL** montrent l'évolution:
1. `fix-user-roles.sql` - Premiers ajustements rôles
2. `fix-user-roles-v2.sql` - Améliorations
3. `fix-user-roles-v3.sql` - Version finale
4. `setup-auto-profile-trigger.sql` - Trigger auto-création profils
5. `fix-missing-profiles.js` - Script de migration

### Workflow Utilisateur

1. **Login** → `login.html`
2. **Add Invoice** → `add-invoice.html` → Upload photo
3. **API Extract** → Claude Vision analyse le reçu
4. **Review Data** → Utilisateur vérifie/corrige
5. **Submit** → Sauvegarde dans Supabase
6. **List** → `index.html` → Vue d'ensemble
7. **Detail** → `invoice-detail.html` → Détails d'une note
8. **Admin** → `admin.html` → Validation/rejet

## 🔗 Intégrations

### Supabase
- **Auth**: Authentification utilisateurs
- **Storage**: Stockage des photos de reçus (à implémenter)
- **Database**: Table `expenses`

### Anthropic Claude Vision
- Modèle: claude-3-5-sonnet-20241022
- Analyse des images de reçus
- Extraction structurée JSON

## 🆘 Troubleshooting

### Claude Vision ne détecte pas bien le reçu
→ Améliorer le prompt avec exemples
→ Vérifier qualité de l'image (résolution, contraste)

### Upload d'image échoue
→ Vérifier taille max (limite à définir)
→ Vérifier format supporté (JPEG, PNG)

### Authentification ne fonctionne pas
→ Vérifier Supabase client configuré côté HTML
→ Vérifier cookies/session

### API ne démarre pas
→ Vérifier variables d'environnement (ANTHROPIC_API_KEY)
→ Vérifier port 3002 disponible

## 📈 Améliorations Futures

- [ ] Upload vers Supabase Storage au lieu de base64
- [ ] Compression des images avant envoi à Claude
- [ ] Cache des résultats d'extraction
- [ ] Export PDF des notes de frais
- [ ] Notifications email pour validations
- [ ] App mobile (PWA)
