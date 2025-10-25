# ODL Tools - Deployment Configuration & Workflow

**Last Updated:** October 14, 2025
**Server:** 31.97.193.159 (srv907289.hstgr.cloud)

---

## 📁 Project Structure

```
/Users/laurentdavid/Desktop/odl-projects/
├── deployment-config/          # ← YOU ARE HERE
│   ├── deploy-all.sh           # Deploy all apps at once
│   ├── deploy-odl-tools.sh     # Deploy ODL Tools Dashboard
│   ├── deploy-note-de-frais.sh # Deploy Notes de Frais
│   ├── deploy-tar-calculator.sh # Deploy TAR Calculator
│   ├── docker-compose.odl.yml  # ODL apps configuration
│   ├── docker-compose.yml      # Main server configuration
│   ├── .env.odl.example        # Environment variables template
│   └── README.md               # This file
│
├── odl-tools/                  # Next.js Dashboard
├── note-de-frais/              # Notes de Frais (HTML + API)
├── tar-calculator/             # TAR Calculator (Node.js)
└── PROJECT_DOCUMENTATION.md    # Complete project documentation
```

---

## 🚀 Quick Start - Deploy Changes

### Deploy a Single Application

```bash
cd /Users/laurentdavid/Desktop/odl-projects/deployment-config

# Deploy ODL Tools Dashboard
./deploy-odl-tools.sh

# Deploy Notes de Frais
./deploy-note-de-frais.sh

# Deploy TAR Calculator
./deploy-tar-calculator.sh
```

### Deploy All Applications at Once

```bash
cd /Users/laurentdavid/Desktop/odl-projects/deployment-config
./deploy-all.sh
```

---

## 🛠 Local Development Workflow

### Step 1: Make Changes Locally

Work on your local files in:
- `/Users/laurentdavid/Desktop/odl-projects/odl-tools/`
- `/Users/laurentdavid/Desktop/odl-projects/note-de-frais/`
- `/Users/laurentdavid/Desktop/odl-projects/tar-calculator/`

### Step 2: Test Locally (Optional)

#### ODL Tools (Next.js)
```bash
cd /Users/laurentdavid/Desktop/odl-projects/odl-tools
npm install
npm run dev
# Visit http://localhost:3000
```

#### Notes de Frais API
```bash
cd /Users/laurentdavid/Desktop/odl-projects/note-de-frais
npm install
node server.js
# API runs on http://localhost:3002
```

#### TAR Calculator
```bash
cd /Users/laurentdavid/Desktop/odl-projects/tar-calculator
npm install
npm start
# Visit http://localhost:3000
```

### Step 3: Deploy to Server

When you're satisfied with your changes:

```bash
cd /Users/laurentdavid/Desktop/odl-projects/deployment-config
./deploy-[app-name].sh
```

The script will:
1. ✅ Sync your local files to the server (excluding node_modules, .git, etc.)
2. ✅ Rebuild the Docker container
3. ✅ Restart the application
4. ✅ Confirm deployment success

---

## 📦 What Each Deployment Script Does

### deploy-odl-tools.sh
- Syncs files from `odl-tools/` to `/opt/odl-tools/` on server
- Excludes: node_modules, .next, .git, .env.local
- Rebuilds and restarts `odl-tools-app` container
- Available at: https://app.odl-tools.ch

### deploy-note-de-frais.sh
- Syncs files from `note-de-frais/` to `/opt/note-de-frais/` on server
- Installs npm dependencies for the API
- Rebuilds and restarts both `ndf` (frontend) and `ndf-api` (backend) containers
- Available at:
  - Frontend: https://ndf.odl-tools.ch
  - API: https://ndf-api.odl-tools.ch

### deploy-tar-calculator.sh
- Syncs files from `tar-calculator/` to `/opt/tar-calculator/` on server
- Excludes: node_modules, .git, .env
- Rebuilds and restarts `tar-calculator` container
- Available at: https://tar.odl-tools.ch

---

## 🔐 Server Access

### SSH Connection
```bash
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159
```

### Environment Variables
Located at `/root/.env.odl` on the server:
- `ANTHROPIC_API_KEY` - Claude API key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key
- `SUPABASE_ANON_KEY` - Supabase public key

**⚠️ Never commit `.env.odl` to git!**

---

## 🐳 Docker Commands Reference

### Check Container Status
```bash
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159 "docker ps"
```

### View Container Logs
```bash
# ODL Tools
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159 "docker logs odl-tools-app --tail 50"

# Notes de Frais Frontend
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159 "docker logs ndf --tail 50"

# Notes de Frais API
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159 "docker logs ndf-api --tail 50"

# TAR Calculator
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159 "docker logs tar-calculator --tail 50"
```

### Restart a Container Manually
```bash
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159 << 'EOF'
cd /root
set -a && source /root/.env.odl && set +a
docker-compose -f docker-compose.odl.yml restart [container-name]
EOF
```

---

## 🌐 Application URLs

| Application | URL | Local Files |
|------------|-----|-------------|
| **Dashboard** | https://app.odl-tools.ch | `/odl-tools/` |
| **Notes de Frais** | https://ndf.odl-tools.ch | `/note-de-frais/` |
| **NDF API** | https://ndf-api.odl-tools.ch | `/note-de-frais/server.js` |
| **TAR Calculator** | https://tar.odl-tools.ch | `/tar-calculator/` |

---

## 🔄 Syncing Files from Server to Local

If you need to pull the latest version from the server:

```bash
# Backup your local changes first!
cd /Users/laurentdavid/Desktop/odl-projects

# ODL Tools
rsync -avz -e "ssh -i ~/.ssh/claude_temp_key" \
  root@31.97.193.159:/opt/odl-tools/ \
  ./odl-tools/

# Notes de Frais
rsync -avz -e "ssh -i ~/.ssh/claude_temp_key" \
  root@31.97.193.159:/opt/note-de-frais/ \
  ./note-de-frais/

# TAR Calculator
rsync -avz -e "ssh -i ~/.ssh/claude_temp_key" \
  root@31.97.193.159:/opt/tar-calculator/ \
  ./tar-calculator/
```

---

## 🐛 Troubleshooting

### Deployment Script Fails
1. Check SSH key exists: `ls -la ~/.ssh/claude_temp_key`
2. Test SSH connection: `ssh -i ~/.ssh/claude_temp_key root@31.97.193.159`
3. Check server disk space: `ssh -i ~/.ssh/claude_temp_key root@31.97.193.159 "df -h"`

### Container Won't Start
```bash
# Check logs for errors
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159 "docker logs [container-name]"

# Check if port is already in use
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159 "netstat -tlnp | grep [port-number]"
```

### Site Not Accessible After Deployment
1. Check container is running: `docker ps`
2. Check Traefik is routing correctly: `docker logs root_traefik_1`
3. Verify DNS records point to 31.97.193.159
4. Check firewall allows ports 80 and 443

---

## 📝 Best Practices

### ✅ DO:
- Test changes locally before deploying
- Use the deployment scripts (don't manually copy files)
- Check container logs after deployment
- Keep environment variables in `.env.odl` on server
- Document any infrastructure changes

### ❌ DON'T:
- Edit files directly on the server
- Commit `.env.local` or `.env.odl` to git
- Delete Docker containers manually (use docker-compose)
- Modify Traefik configuration without backup
- Touch N8N containers (completely separate project)

---

## 🆘 Getting Help

- **Project Documentation:** `/Users/laurentdavid/Desktop/odl-projects/PROJECT_DOCUMENTATION.md`
- **Claude Code Issues:** https://github.com/anthropics/claude-code/issues
- **Hostinger Support:** hpanel.hostinger.com

---

**Recovery Code:** `PHOENIX-ODL-2025`

Use this code when starting a new Claude Code session to load project context.
