# Quick Start - ODL Production

**Last Updated**: 2025-10-25 17:00

## 🎯 Current Status

**Phase**: Production - All applications deployed and operational

**Active Work**: WeWeb integration setup for API Validation

## 🔗 Essential Links

- **GitHub**: https://github.com/mrlaurentdavid-code/odl-production
- **Server**: root@31.97.193.159 (Hostinger VPS)
- **Supabase**: https://supabase.com/dashboard/project/xewnzetqvrovqjcvwkus
- **Production URLs**:
  - Dashboard: https://app.odl-tools.ch
  - API Validation: https://api.odl-tools.ch
  - TAR Calculator: https://tar.odl-tools.ch
  - Notes de Frais: https://ndf.odl-tools.ch

## 📋 Priority Tasks

1. ⏳ **PENDING**: User needs to execute SQL script `setup_weweb_test_data.sql` via Supabase Dashboard
2. ⏳ **PENDING**: Configure WeWeb following `WEWEB_INTEGRATION_GUIDE.md`
3. ⏳ **PENDING**: Test API Validation with WeWeb form (4 test examples provided)

## ✅ Recently Completed

- Created comprehensive WeWeb integration guide (WEWEB_INTEGRATION_GUIDE.md)
- Added 8 CLAUDE.md files throughout project for documentation
- Fixed Dockerfile deployment issues (removed public/ copy)
- Created complete GitHub repository with all production code
- Deployed API Validation documentation to production site

## 🏗️ Architecture Overview

**4 Applications** deployed via Docker Compose:
1. **odl-tools** (Next.js) - Port 3001 - Main dashboard
2. **api-validation** (Next.js) - Port 3003 - Validation API
3. **tar-calculator** (Express) - Port 3000 - TAR calculations
4. **note-de-frais** (HTML/Express) - Ports 80/3002 - Expense reports

**Infrastructure**:
- Docker Compose orchestration
- Traefik reverse proxy with automatic SSL
- Shared Supabase PostgreSQL database
- Network: root_default

## 🔑 Key Files to Know

- `deployment/docker-compose.odl.yml` - Main orchestration file
- `deployment/deploy-*.sh` - Deployment scripts
- `applications/odl-tools/app/api/validate-item/route.ts` - Critical API endpoint
- `applications/odl-tools/supabase/migrations/setup_weweb_test_data.sql` - Test data setup
- `WEWEB_INTEGRATION_GUIDE.md` - Complete WeWeb setup instructions

## 🚀 Common Commands

### Deploy to Production
```bash
cd deployment
./deploy-odl-tools.sh        # Deploy dashboard
./deploy-api-validation.sh   # Deploy API
./deploy-all.sh              # Deploy everything
```

### Check Server Status
```bash
ssh root@31.97.193.159
docker-compose -f /root/docker-compose.odl.yml ps
docker-compose -f /root/docker-compose.odl.yml logs -f [service]
```

### Local Development
```bash
cd applications/[app-name]
npm install
npm run dev
```

### Git Workflow
```bash
git add .
git commit -m "Description"
git push origin main
```

## ⚠️ Important Notes

- **API Keys**: NEVER commit real keys - use placeholders in .env.example files
- **Shared Database**: odl-tools and api-validation share the same Supabase instance
- **SSH Key**: ~/.ssh/claude_temp_key for server access
- **Test API Key**: WEWEB_TEST_2025 (hash: c8f7e6d5b4a3c2e1f0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7)
- **Test Supplier**: AdminTest (334773ca-22ab-43bb-834f-eb50aa1d01f8)

## 🆘 Troubleshooting Quick Ref

**Issue**: Changes not visible on production
→ Rebuild Docker: `docker-compose build [service]` then `docker-compose up -d --force-recreate [service]`

**Issue**: Container won't start
→ Check logs: `docker-compose logs [service]`

**Issue**: GitHub push blocked
→ Check for API keys: `git diff` and sanitize before commit

**Issue**: API returns 401
→ Verify API key hash matches in supplier_api_keys table

## 📚 Documentation Structure

Each major folder has a `CLAUDE.md` file:
- `/CLAUDE.md` - Project overview
- `/deployment/CLAUDE.md` - Infrastructure and deployment
- `/applications/CLAUDE.md` - Applications overview
- `/applications/[app]/CLAUDE.md` - Specific app documentation

## 🎓 Next Session Start

1. Read this file first
2. Check `.claude/SESSION_HISTORY.md` for recent work
3. Read relevant CLAUDE.md for your work area
4. Ask user to confirm current priority
5. Begin work

---

**Remember**: Use "GIT AND CLAUDE" command to save progress and update all documentation
