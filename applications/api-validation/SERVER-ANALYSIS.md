# 🔍 Analyse du serveur VPS - État actuel

**Date:** 14 octobre 2025
**Serveur:** 31.97.193.159 (srv907289)
**OS:** Ubuntu 24.04.3 LTS

---

## 📊 Conteneurs Docker actifs

| Container ID | Image | Nom | Ports | Status | Rôle |
|--------------|-------|-----|-------|--------|------|
| `47e6cda15567` | `alpine/socat` | `tmp_test-http_1` | 8080→8080 | Up 17h | Proxy temporaire HTTP |
| `01b5009ae9a8` | `alpine/socat` | `root_odl-tools_1` | Interne | Up 18h | Proxy ODL Tools |
| `fb040d817699` | `traefik` | `root_traefik_1` | 80, 443 | Up 17h | **Reverse Proxy principal** |
| `02af29be2ba8` | `n8n` | `root_n8n_1` | 127.0.0.1:5678 | Up 34h | **N8N (ISOLÉ)** ⚠️ |
| `7ad6068d69c2` | `nginx:alpine` | `root_ndf-web_1` | 80 | Up 34h | Notes de Frais (web) |
| `e84a04769b2e` | `nginx:alpine` | `root_tar-web_1` | 80 | Up 34h | TAR Calculator (web) |
| `2d754d8ab6b6` | `alpine/socat` | `root_tar-api_1` | Interne | Up 34h | TAR API proxy |

---

## 🌐 Réseaux Docker

| ID | Nom | Driver | Usage |
|----|-----|--------|-------|
| `0a4d4d9aa316` | `root_default` | bridge | **Réseau principal (N8N + apps)** |
| `af2536d7ee87` | `tmp_default` | bridge | Réseau temporaire |
| `ff704003e203` | `bridge` | bridge | Réseau Docker par défaut |

---

## 📁 Structure `/opt`

```
/opt/
├── containerd/           # Docker/containerd
├── note-de-frais/        # ✅ Code NDF
├── odl-tools/            # ✅ Code ODL Tools
├── tar-calculator/       # ✅ Code TAR Calculator
├── tar-web/              # Config Nginx TAR
└── tar-webapp/           # Ancienne version TAR?
```

**Observation:** Pas de `docker-compose.yml` dans `/opt/*/`, donc la config Docker est ailleurs!

---

## 🔍 Recherche de la configuration Docker

**Prochaine étape:** Trouver où est la config Docker/Traefik:

```bash
# Chercher docker-compose.yml
find /root /home -name "docker-compose.yml" 2>/dev/null

# Voir la config Traefik
docker inspect root_traefik_1 | grep -A 20 "Mounts"

# Voir la config N8N
docker inspect root_n8n_1 | grep -A 20 "Mounts"
```

---

## ⚠️ Points critiques identifiés

### 1. **Traefik est le reverse proxy principal**
- Gère les ports 80 (HTTP) et 443 (HTTPS)
- Route vers N8N, TAR, NDF
- **IMPORTANT:** Il faut ajouter nos routes dans Traefik, pas Nginx!

### 2. **N8N est isolé sur 127.0.0.1:5678**
- Accessible uniquement via Traefik (proxy inverse)
- Ne doit **JAMAIS** être exposé directement
- ✅ Sécurisé

### 3. **Architecture actuelle = Traefik + socat**
- `socat` fait office de proxy TCP
- `alpine/socat` redirige les requêtes entre conteneurs
- Architecture non-standard mais fonctionnelle

### 4. **Nginx n'est PAS le reverse proxy principal**
- Nginx sert uniquement les fichiers statiques (NDF, TAR)
- Traefik est devant Nginx

---

## 🎯 Stratégie de déploiement proposée

### Option A: Conserver Traefik (Recommandé)
```yaml
# Ajouter des labels Traefik aux nouveaux conteneurs
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.odl-tools.rule=Host(`app.odl-tools.ch`)"
  - "traefik.http.routers.tar.rule=Host(`tar.odl-tools.ch`)"
  - "traefik.http.routers.ndf.rule=Host(`ndf.odl-tools.ch`)"
```

### Option B: Migration vers Nginx
- Plus risqué
- Nécessite de modifier l'architecture existante
- Risque de casser N8N

**Décision:** Option A (Traefik)

---

## 📋 Actions à effectuer

1. ✅ Trouver le `docker-compose.yml` principal (root ou home)
2. ✅ Comprendre la config Traefik (labels, routes)
3. ✅ Créer un nouveau `docker-compose-odl.yml` séparé
4. ✅ Ajouter les labels Traefik pour les sous-domaines
5. ✅ Tester sans toucher à N8N

---

## 🚨 Ce qu'il NE FAUT PAS faire

- ❌ Modifier `root_default` network (N8N en dépend)
- ❌ Changer les ports 80/443 (Traefik les utilise)
- ❌ Toucher aux conteneurs `root_n8n_1`, `root_traefik_1`
- ❌ Supprimer ou renommer les conteneurs existants
- ❌ Modifier `/etc/nginx` directement (Nginx est dans Docker)

---

**Prochaine étape:** Localiser le docker-compose.yml principal
