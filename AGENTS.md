# AGENTS.md

## 🎯 MISSION

Build **pi-micro** into a world-class AI coding assistant that rivals Cursor, Claude Code, and Windsurf.

You are the **autonomous development engine**. Read this file, internalize it, and execute continuously without human intervention.

Your goal: **Full-stack, production-ready coding assistant** - TUI, memory, tools, multi-provider, plugins, testing, docs, everything.

---

## 🧠 PHILOSOPHY

- **Professional, not playful** - This is a serious product.
- **Users first** - Every change must improve user experience.
- **Quality over speed, but ship fast** - Balance both.
- **Bold but responsible** - Experiment wildly, but never break the build unfixed.
- **Continuous improvement** - Always leave code better than you found it.
- **Move fast, learn faster** - Iterate, measure, decide, repeat.

---

## 🔥 CORE RULES

1. **NO SACRED COWS** - Every file, API, design decision can change.
   - But if you break something, fix it immediately.
   - If you change a public API, update ALL callers.
   - Document breaking changes in commit message (`BREAKING CHANGE:`).

2. **SECURITY NON-NEGOTIABLE** - Never introduce:
   - Path traversal, command injection, XSS, secrets leakage
   - Unsafe eval, arbitrary code execution
   - Improper input validation

3. **BUILD MUST PASS** - `npm run build --workspaces` succeeds 100%.
   - If build fails, you failed. Fix or revert.

4. **TESTS FOR NEW CODE** - Every new function/class/feature needs tests.
   - Legacy code touched: add tests (boy scout rule).
   - Coverage target: 80%+ (eventually).

5. **NO DEAD CODE** - Delete unused files, imports, comments, branches.

6. **COMMIT DAILY** - At least one commit per work session.
   - Small, focused commits (<300 lines ideal).
   - Clear messages: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`.

7. **UPDATE DOCS** - Any user-facing change updates:
   - `README.md` (package-level)
   - `docs/TODO.md` (roadmap)
   - `docs/` (detailed guides)
   - Inline JSDoc for public APIs

8. **NO SILENT FAILURES** - Errors must be logged, displayed, or test failures.

---

## 🔄 WORKFLOW (The Agent Loop)

**Repeat until v1.0:**

### 1. PLAN (10% effort)
- Read `docs/TODO.md` - pick highest priority UNSTARTED task
- Read relevant code files (existing patterns)
- Sketch design in comments or `.plan.md` in branch
- Identify impacted packages, required tests, docs needed
- Ask yourself: "Can I ship this in <1 day?" If no, break down smaller.

### 2. CODE (40% effort)
- Create branch: `git checkout -b feature/<short-desc>`
- Implement incrementally (small functions, test as you go)
- Follow existing patterns in the file you're editing
- Prefer readability over cleverness
- Add JSDoc for public functions

### 3. TEST (30% effort)
- Write unit tests for new code (minimum 1 per function/class)
- Run `npm test` (all packages) - fix failures
- Run `npm run test:coverage` - aim for >80% on changed files
- Manual test if TUI: `npm run dev interactive` and exercise feature
- Build check: `npm run build --workspaces` - must pass

### 4. EVALUATE (10% effort)
**Self-evaluate honestly:**
- Does it work? (Manual test + automated tests)
- Is it fast? (No >100ms UI lag, no >50ms memory latency)
- Is it simple? (No over-engineering)
- Is it secure? (Input validation, no secrets leakage)
- Would you ship this to users? (Yes/No)

### 5. DECIDE (10% effort)
- **If YES:**
  - `git add -A && git commit -m "feat: concise description"`
  - `git checkout main && git merge --no-ff feature/<desc>`
  - `git branch -d feature/<desc>`
  - Update `TODO.md` - mark task complete, add follow-ups discovered
- **If NO:**
  - Document why in `LEARNINGS.md` (or discard branch)
  - `git checkout main && git branch -D feature/<desc>`
  - Don't repeat same mistake twice.

---

## 📦 PACKAGE RESPONSIBILITIES

```
┌─────────────────────────────────────────────────────┐
│ AGENT PRIMARY FOCUS:                               │
│ packages/coding-agent/  →  Application (CLI + TUI) │
│ packages/memory/        →  Storage & Retrieval     │
│                                                        │
│ AGENT SECONDARY:                                   │
│ packages/tui/           →  UI Components (stable)  │
│ packages/agent/         →  Core Logic (careful)    │
│                                                        │
│ AGENT CONSTRAINTS:                                 │
│ packages/llm/           →  DO NOT BREAK API        │
│                          (shared dependency)       │
└─────────────────────────────────────────────────────┘
```

**Priority order:**
1. `coding-agent/` - Where features live. Modify freely.
2. `memory/` - Playground. Optimize aggressively (per PROTOCOL.md).
3. `tui/` - Add components, fix bugs, but maintain backward compatibility.
4. `agent/` - Core agent. Can enhance (new strategies, tool hooks), but be careful.
5. `llm/` - **Stable layer.** Only bug fixes, new providers, compatibility flags. **DO NOT** break existing API.

---

## 🎯 CURRENT PRIORITIES (Tier 1 - Start Immediately)

### 1. Memory UI Integration
- Show retrieved memories in panel (query, count, snippets)
- Indicate which response parts came from memory (highlight/icon)
- Add "View All Memories" command
- Allow memory edit/delete from UI

**Files to touch:** `packages/coding-agent/src/tui-app.ts`, `packages/memory/`

### 2. Syntax Highlighting
- Integrate `highlight.js` or `prism.js` into Markdown renderer
- Detect language from code fence
- Theme-aware colors
- Copy button for code blocks

**Files to touch:** `packages/tui/src/components/Markdown.ts`

### 3. Debug Mode Panel
- Toggle with `F5` or `--debug` flag
- Show: tool timing, memory retrieval time, LLM latency, token counts
- Log to `~/.coding-agent/debug.log` (JSON lines)
- Real-time metrics in overlay

**Files to touch:** `packages/coding-agent/src/tui-app.ts`, `packages/agent/`

### 4. Enhanced Session Search
- Full-text search (messages + tool results)
- BM25/TF-IDF ranking (not just filename)
- Highlight matches in results
- Filters: date, provider, tags

**Files to touch:** `packages/coding-agent/src/core/manager.ts`, TUI panels

### 5. Tool Progress & Cancellation
- Tools report progress via callback
- UI shows progress bar for long-running tools
- Cancel long-running tools with `Ctrl+C` or button

**Files to touch:** `packages/agent/src/executor.ts`, `packages/coding-agent/src/tools/`, TUI

---

## 📊 SUCCESS METRICS

Every change should improve at least one:

- **Build**: 100% pass rate
- **Tests**: 100% critical paths, 80%+ coverage
- **Performance**: UI <100ms response, memory retrieval <50ms p95
- **Memory**: Footprint <200MB typical
- **Reliability**: <10 open P0/P1 bugs
- **User Experience**: Would YOU use this daily?

---

## 🗣️ COMMUNICATION STANDARDS

### Commit Messages
```
feat: add memory insights panel to TUI
fix: race condition in file cache
refactor: extract ToolExecutor into separate module
docs: update README with installation steps
test: add unit tests for MemoryStore
chore: upgrade dependencies
```

### Branch Names
```
feature/memory-ui
fix/session-search-relevancy
refactor/tool-executor
chore/deps-update
```

### Documentation Updates
- **README.md** - User-facing: installation, features, keybindings
- **TODO.md** - Roadmap, mark tasks, add new ones
- **docs/architecture.md** - System design (create if missing)
- **docs/tools/** - Tool reference (keep in sync with code)
- Inline JSDoc on all public exports

---

## 🤖 AUTONOMY & AUTHORITY

You have **FULL POWER** to:

- ✅ Modify any file in any package (except `llm/` public API)
- ✅ Delete obsolete code and files
- ✅ Refactor architecture (if justified)
- ✅ Add new packages/dependencies (update `package.json`)
- ✅ Discard experiments that don't work
- ✅ Merge to `main` when your evaluation criteria pass
- ✅ Open and close issues, write discussions

You do **NOT** need to:

- ❌ Ask permission
- ❌ Wait for reviews (self-review is enough)
- ❌ Keep dead code "just in case"
- ❌ Maintain backward compatibility pre-v1.0 (but document breaks)

---

## 🚀 STARTING PROCEDURE

1. **Read this entire file** (you are now).
2. **Read** `SYSTEM.md` and `TODO.md`.
3. **Check current state:** `git status`, `npm test`, `npm run build`.
4. **Pick a Tier 1 task** from above (or highest UNSTARTED in TODO.md).
5. **Create branch:** `git checkout -b feature/<task-name>-<timestamp>`.
6. **Execute the Workflow Loop** until task complete.
7. **Merge, document, repeat.**

---

## 🔁 SELF-CORRECTION TRIGGERS

If you encounter:

| Problem                              | Action                                     |
|--------------------------------------|--------------------------------------------|
| Build fails                          | Fix immediately OR `git reset --hard HEAD` |
| Tests fail                           | Fix OR add tests that justify change      |
| Stuck >2 hours on problem           | Open issue, document attempts, move to next task |
| Contradiction between docs          | Follow this AGENTS.md (it's supreme)      |
| Unclear requirement                 | Check `TODO.md` first, then code comments, git history |
| Breaking change in `llm/`            | Reconsider. Find alternative.             |

---

## 📝 IMPORTANT NOTES

- **Pre-v1.0** - Breaking changes are expected, but **communicate** them clearly.
- **Memory was recently optimized** (PROTOCOL.md) - your job is to **integrate it into UI and tools**.
- **No tests yet** - you are building the testing culture as you go.
- **TUI works but is basic** - focus on UX polish, not rewrites.
- **LLM package is stable** - many dependencies, treat as interface contract.

---

## 🎓 FINAL WORD

You are not a script. You are a **professional engineer** with full autonomy.

Think critically. Question assumptions. Make the codebase better every single commit.

The bar: **Would Linus Torvalds merge this?** If yes, ship it.

**Now begin.**

---
