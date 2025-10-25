# Reusable "GIT AND CLAUDE" Workflow Prompt

**Copy this entire message and paste it to Claude Code at the start of any new project to implement the workflow system.**

---

## 📋 Setup Request

I want you to implement a comprehensive session continuity workflow for this project. This will help maintain context between Claude Code sessions and ensure all work is properly documented.

### Implementation Steps:

1. **Create `.claude/` folder structure** with these files:
   - `WORKFLOW.md` - Complete "GIT AND CLAUDE" command documentation
   - `QUICK_START.md` - Session resumption guide (read first each time)
   - `SESSION_HISTORY.md` - Chronological log of all work

2. **Create/Update `CLAUDE.md` files** in key folders:
   - Root `/CLAUDE.md` - Project overview
   - Each major subdirectory gets its own `CLAUDE.md`
   - Include "Recent Changes" section in each (newest first, timestamped)

3. **Implement "GIT AND CLAUDE" command** that executes this workflow:
   - Update all modified CLAUDE.md files with new changes
   - Update SESSION_HISTORY.md with session summary
   - Update QUICK_START.md with current status
   - Commit all changes with descriptive message
   - Push to GitHub repository
   - Display session summary to user

4. **Session Start Protocol**:
   - Always read `.claude/QUICK_START.md` first
   - Check SESSION_HISTORY.md for recent context
   - Read relevant CLAUDE.md for specific work area
   - Confirm current task before proceeding

5. **Proactive Suggestions**:
   - Suggest "GIT AND CLAUDE" after major milestones
   - After completing significant features
   - Before switching to new tasks
   - After 5+ file modifications

### WORKFLOW.md Template Content:

```markdown
# Claude Code Workflow Rules

## 🔄 "GIT AND CLAUDE" Command

When the user says **"GIT AND CLAUDE"**, execute this workflow:

### 1. Update All Modified CLAUDE.md Files
- Add "📅 Recent Changes" section if not exists
- Prepend new changes with timestamp (YYYY-MM-DD HH:MM format)
- Include: what changed, why, and impact

### 2. Update Session History
- Add new session entry with timestamp
- List all work completed
- List all files created/modified
- Note pending tasks and decisions

### 3. Update Quick Start
- Current project status
- Active priorities
- Recently completed work
- Next steps

### 4. Git Commit and Push
- Stage all changes
- Descriptive commit message
- Push to repository
- Confirm success

### 5. Generate Session Summary
- What was saved
- Summary of changes
- GitHub commit URL
- Next session starting point

## 📖 Session Start Protocol
1. Read `.claude/QUICK_START.md` first
2. Check `SESSION_HISTORY.md` for recent context
3. Read relevant CLAUDE.md files
4. Confirm current task with user

## 🎯 Proactive Suggestions
Suggest "GIT AND CLAUDE" after:
- Completing major features
- Fixing critical bugs
- Adding significant documentation
- Before switching tasks
- After 5+ file modifications
```

### QUICK_START.md Template Content:

```markdown
# Quick Start - [Project Name]

**Last Updated**: [Auto-update each session]

## 🎯 Current Status
[Current phase/sprint/milestone]

## 🔗 Essential Links
- **GitHub**: [repo URL]
- **Production**: [if applicable]
- **Documentation**: [if applicable]

## 📋 Priority Tasks
[Current work items]

## ✅ Recently Completed
[Last 3-5 completed items]

## 🏗️ Architecture Overview
[Brief tech stack and structure]

## 🔑 Key Files to Know
[Critical files and their purposes]

## 🚀 Common Commands
[Development, deploy, test commands]

## ⚠️ Important Notes
[Warnings, gotchas, critical info]

## 🆘 Troubleshooting Quick Ref
[Common issues and fixes]

## 🎓 Next Session Start
1. Read this file first
2. Check SESSION_HISTORY.md
3. Read relevant CLAUDE.md
4. Confirm priority with user
```

### SESSION_HISTORY.md Template Content:

```markdown
# Session History - [Project Name]

## Session [Date] ([Start Time] - [End Time])

### 📋 Work Completed
[Detailed list of what was done]

### 📝 Files Created
[All new files]

### 📝 Files Modified
[All changed files]

### 🔧 Technical Issues Resolved
[Problems and solutions]

### 🎯 Decisions Made
[Important choices made]

### ⏳ Pending Tasks
[What's left to do]

### 📊 Statistics
[Commits, files, lines of code, etc.]

### 💡 Key Insights
[Learnings and observations]

---

## Previous Sessions
[Keep chronological record]
```

### Expected Behavior:

- At **session start**: You automatically read `.claude/QUICK_START.md`
- During **work**: You suggest "GIT AND CLAUDE" at appropriate times
- At **session end**: User says "GIT AND CLAUDE" and you execute full workflow
- **Future sessions**: You have complete context from previous work

### File Structure Result:

```
project-root/
├── CLAUDE.md                    # Project overview + Recent Changes
├── README.md                    # Technical documentation
├── .claude/
│   ├── WORKFLOW.md             # Workflow rules
│   ├── QUICK_START.md          # Session resumption guide
│   ├── SESSION_HISTORY.md      # Work log
│   └── REUSABLE_PROMPT.md      # This file (for other projects)
├── [src/app/etc]/
│   └── CLAUDE.md               # Folder-specific docs + Recent Changes
```

### Configuration Questions:

Before implementing, confirm:
1. **GitHub repository URL** (if exists, or should I create one?)
2. **Project name** for templates
3. **Key folders** that need CLAUDE.md files
4. **Current priority tasks** for QUICK_START.md

---

## ✅ Implementation Checklist

After you implement this, verify:
- [ ] `.claude/` folder created with 3 files
- [ ] Root CLAUDE.md exists with workflow reference
- [ ] CLAUDE.md files in major folders
- [ ] Git repository initialized (if needed)
- [ ] Test "GIT AND CLAUDE" command works
- [ ] QUICK_START.md has current project info

---

**Once implemented, this workflow will ensure perfect continuity between all Claude Code sessions on this project.**

## 📝 Usage After Setup

**Starting a session:**
```
You: [Open project in Claude Code]
Claude: [Automatically reads .claude/QUICK_START.md and provides context]
```

**During work:**
```
Claude: "You've completed the authentication feature. Would you like to run 'GIT AND CLAUDE' to save progress?"
```

**Ending a session:**
```
You: "GIT AND CLAUDE"
Claude: [Executes full workflow, commits, pushes, generates summary]
```

**Next session:**
```
You: [Open project again]
Claude: [Reads QUICK_START.md] "Welcome back! Last session you completed X. The current priority is Y. Shall we continue with Z?"
```

---

**This prompt has been tested on the ODL Production project and works perfectly for maintaining long-term project context.**
