# Claude Code Workflow Rules

## 🔄 "GIT AND CLAUDE" Command

When the user says **"GIT AND CLAUDE"**, execute this workflow:

### 1. Update All Modified CLAUDE.md Files

For each CLAUDE.md file that relates to modified code/folders:
- Add a "📅 Recent Changes" section (if not exists)
- Prepend new changes with timestamp
- Keep changes chronological (newest first)
- Include: what changed, why, and impact

Format:
```markdown
## 📅 Recent Changes

- 2025-10-25 16:30: [Description of change]
- 2025-10-25 15:45: [Description of change]
```

### 2. Update Session History

Update `.claude/SESSION_HISTORY.md`:
- Add new session entry with timestamp
- List all work completed
- List all files created/modified
- Note any pending tasks
- Record any important decisions made

### 3. Update Quick Start

Update `.claude/QUICK_START.md`:
- Current project status
- Active priorities
- Recently completed work
- Next steps
- Important notes/blockers

### 4. Git Commit and Push

- Stage all changes
- Create descriptive commit message
- Push to GitHub repository
- Confirm push successful

### 5. Generate Session Summary

Provide user with:
- ✅ What was saved
- 📝 Summary of changes
- 🔗 GitHub commit URL
- 📋 Next session starting point

## 🎯 Proactive Suggestions

Suggest "GIT AND CLAUDE" after:
- Completing a major feature
- Fixing critical bugs
- Adding significant documentation
- Before switching to a new task
- After 5+ file modifications

## 📖 Session Start Protocol

At the start of each new session:
1. Read `.claude/QUICK_START.md` first
2. Check `.claude/SESSION_HISTORY.md` for recent context
3. Read relevant CLAUDE.md files for specific work area
4. Confirm current task with user before proceeding

## 📂 File Structure

```
project-root/
├── CLAUDE.md                    # Project overview
├── .claude/
│   ├── WORKFLOW.md             # This file - workflow rules
│   ├── QUICK_START.md          # Read first each session
│   └── SESSION_HISTORY.md      # Chronological work log
├── applications/
│   └── [app-name]/
│       └── CLAUDE.md           # App-specific docs (with Recent Changes)
└── deployment/
    └── CLAUDE.md               # Deployment docs (with Recent Changes)
```

## 🔧 Maintenance

- Keep SESSION_HISTORY.md under 500 lines (archive old sessions)
- Update QUICK_START.md every session
- Prune CLAUDE.md Recent Changes older than 30 days
- Verify GitHub push successful before ending session

## 🚨 Critical Rules

1. **NEVER** commit sensitive data (API keys, passwords)
2. **ALWAYS** verify .gitignore before first commit
3. **ALWAYS** test locally before "GIT AND CLAUDE"
4. **ALWAYS** confirm GitHub repository URL is correct
5. **ALWAYS** provide clear commit messages

## 📝 Commit Message Format

```
[Type]: Brief description

- Detailed change 1
- Detailed change 2
- Detailed change 3

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: Add, Update, Fix, Refactor, Docs, Deploy, Config

## 🎓 For New Projects

To implement this workflow in a new project:
1. Create `.claude/` folder at root
2. Copy this WORKFLOW.md
3. Create QUICK_START.md with project basics
4. Create empty SESSION_HISTORY.md
5. Add CLAUDE.md files in main folders
6. Initialize git repository
7. Test "GIT AND CLAUDE" command

---

**This workflow ensures continuity between Claude Code sessions and maintains comprehensive project documentation.**
