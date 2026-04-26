# TODO: Agent Package Implementation

This file outlines the work needed to bring the `@picro/agent` package to full feature parity with the legacy `pi-agent-legacy` while implementing new features and improvements.

## 🎯 Mission

Build a professional, extensible agent framework that serves as the core logic for the pi-micro AI coding assistant.
**Bắt chước tất cả features từ legacy mà KHÔNG copy code.**

## 📋 Legacy Features Analysis - Đã Đọc Đầy Đủ

### Files Đã Đọc Từ Legacy:
- `pi-agent-legacy/core/` (27 files) - Agent core logic
- `pi-agent-legacy/coding/core/` (27 files) - Full core implementation  
- `pi-agent-legacy/coding/tools/` (12 files) - Tool implementations
- `pi-agent-legacy/coding/cli/` (6 files) - CLI arguments
- `pi-agent-legacy/coding/utils/` (15+ files) - Utilities
- `pi-agent-legacy/coding/core/extensions/` (4 files) - Extension system
- `pi-agent-legacy/coding/core/compaction/` (3 files) - Session compaction

---

## 🔴 Phase 1: Core Infrastructure ( Cao Ưu Tiên )

### 1. SessionManager - Quản Lý Sessions ✅ Cần Implement
- [ ] Học từ: `session-manager.ts` (~800 dòng)
- [ ] Session entry types: message, thinking_level_change, model_change, compaction, branch_summary, custom, custom_message, label, session_info
- [ ] Tree structure với id/parentId cho branching
- [ ] Session file format: JSONL với header
- [ ] Methods: newSession, appendMessage, branch, branchWithSummary, getBranch, getTree, getEntries
- [ ] Session versioning và migration (v1 → v3)
- [ ] Compaction integration
- [ ] Labels và bookmarks
- [ ] File persistence với locking

### 2. SettingsManager - Quản Lý Settings ✅ Cần Implement
- [ ] Học từ: `settings-manager.ts` (~600 dòng)
- [ ] Settings interface với nested objects (compaction, branchSummary, retry, terminal, images, markdown)
- [ ] File locking với proper-lockfile
- [ ] Global vs Project scope
- [ ] Deep merge settings pattern
- [ ] Migration từ legacy format (queueMode → steeringMode, websockets → transport)
- [ ] Async flush queue
- [ ] Validation với migrations

### 3. AuthStorage - Quản Lý Credentials ✅ Cần Implement  
- [ ] Học từ: `auth-storage.ts` (~350 dòng)
- [ ] API key credential storage
- [ ] OAuth credential storage với auto-refresh
- [ ] File locking cho concurrency
- [ ] Runtime overrides (CLI --api-key)
- [ ] Environment variable fallback
- [ ] OAuth login/logout flows

### 4. CLI Args - Parse Arguments ✅ Cần Implement
- [ ] Học từ: `cli/args.ts` (~250 dòng)
- [ ] Full argument parsing (--provider, --model, --api-key, --system-prompt, --thinking, v.v.)
- [ ] @fileArgs support
- [ ] Extension flags support
- [ ] Help display
- [ ] Validation với diagnostics

### 5. EventBus - Pub/Sub Events ✅ Cần Implement
- [ ] Học từ: `event-bus.ts` (~40 dòng)
- [ ] Channel-based pub/sub
- [ ] Error handling trong handlers
- [ ] Clear method

### 6. Timings - Startup Profiling ✅ Cần Implement
- [ ] Học từ: `timings.ts` (~40 dòng)
- [ ] PI_TIMING=1 environment variable
- [ ] time() với reset/print
- [ ] Cumulative timing

---

## 🟡 Phase 2: Tools Implementation (Trung Bình Ưu Tiên)

### 7. BashTool - Execute Commands ✅ Cần Implement
- [ ] Học từ: `tools/bash.ts` (~300 dòng)
- [ ] Shell config resolution (cross-platform)
- [ ] Process spawning với streaming
- [ ] Timeout handling
- [ ] AbortSignal integration
- [ ] Output truncation (lines + bytes)
- [ ] Temp file cho large output
- [ ] Render state management

### 8. ReadTool - Read Files ✅ Cần Implement
- [ ] Học từ: `tools/read.ts` (~300 dòng)
- [ ] Text + image support
- [ ] Offset/limit parameters
- [ ] Output truncation
- [ ] Image resizing
- [ ] MIME type detection
- [ ] Render với highlighting

### 9. EditTool - Edit Files ✅ Cần Implement  
- [ ] Học từ: `tools/edit.ts` (~400 dòng)
- [ ] Multiple edits trong one call
- [ ] Diff computation
- [ ] File mutation queue
- [ ] Preview rendering
- [ ] Pre/post execution rendering
- [ ] Error handling

### 10. WriteTool - Write Files ✅ Cần Implement
- [ ] Học từ: `tools/write.ts` (~250 dòng)
- [ ] Auto-create directories
- [ ] Render với syntax highlighting
- [ ] Line truncation

### 11. GrepTool - Search Content ✅ Cần Implement
- [ ] Học từ: `tools/grep.ts` (~350 dòng)
- [ ] Pattern matching (regex + literal)
- [ ] Glob filtering
- [ ] Context lines
- [ ] Output truncation
- [ ] Uses ripgrep (rg)

### 12. FindTool - Find Files ✅ Cần Implement
- [ ] Học từ: `tools/find.ts` (~350 dòng)
- [ ] Glob pattern matching
- [ ] Output truncation
- [ ] Uses fd

### 13. LsTool - List Directory ✅ Cần Implement
- [ ] Học từ: `tools/ls.ts` (~250 dòng)
- [ ] Directory suffix (/)
- [ ] Entry sorting
- [ ] Limit support

---

## 🟢 Phase 3: Additional Features (Thấp Ưu Tiên)

### 14. Skills - Skills Loading ✅ Cần Implement
- [ ] Học từ: `skills.ts` (~300 dòng)
- [ ] SKILL.md discovery
- [ ] Frontmatter parsing (name, description, disable-model-invocation)
- [ ] Validation (name format, description required)
- [ ] Collision detection
- [ ] Format for prompt

### 15. Slash Commands ✅ Cần Implement
- [ ] Học từ: `slash-commands.ts` (~40 dòng)
- [ ] Built-in commands: settings, model, export, import, share, copy, name, session, changelog, hotkeys, fork, clone, tree, login, logout, new, compact, resume, reload, quit

### 16. Model Registry ⚠️ Legacy Phụ Thuộc
- [ ] Học từ: `model-registry.ts` (~500 dòng)
- [ ] Phụ thuộc vào @mariozechner/pi-ai
- [ ] Để sau khi core stable

### 17. Extensions System ✅ Cần Implement
- [ ] Học từ: `extensions/loader.ts` (~400 dòng)
- [ ] Extension loader với jiti
- [ ] Extension API với registration methods
- [ ] Virtual modules cho Bun binary
- [ ] Discovery từ directories
- [ ] package.json manifest support

### 18. Compaction - Session Compaction ✅ Cần Implement
- [ ] Học từ: `compaction/compaction.ts` (~500 dòng)
- [ ] Token estimation
- [ ] Cut point detection
- [ ] Summarization với LLM
- [ ] File operation tracking
- [ ] Iterative updates

### 19. Telemetry ✅ Cần Implement
- [ ] Học từ: `telemetry.ts` (~20 dòng)
- [ ] PI_TELEMETRY environment check
- [ ] Settings integration

### 20. Diagnostics ✅ Cần Implement
- [ ] Học từ: `diagnostics.ts` (~20 dòng)
- [ ] Resource collision interface
- [ ] Resource diagnostic interface

---

## 🛠 Utilities Cần Implement

### 21. Shell Utils
- [ ] Học từ: `utils/shell.ts` (~150 dòng)
- [ ] getShellConfig() - cross-platform
- [ ] getShellEnv() - với binDir
- [ ] killProcessTree() - cross-platform
- [ ] trackDetachedChildPid()

### 22. Git Utils
- [ ] Học từ: `utils/git.ts` (~100 dòng)
- [ ] parseGitUrl() - với hosted-git-info
- [ ] Extract repo, host, path, ref

### 23. Child Process Utils
- [ ] Học từ: `utils/child-process.ts` (~80 dòng)
- [ ] waitForChildProcess() - với stdio graceful

### 24. Paths Utils
- [ ] Học từ: `utils/paths.ts` (~20 dòng)
- [ ] isLocalPath() - check npm:, git:, http:, etc.

---

## 🔧 Architecture & Quality

### Code Quality
- [ ] Add JSDoc comments cho all public APIs
- [ ] Consistent error handling patterns
- [ ] Remove dead code/unused imports
- [ ] TypeScript strictness

### Testing
- [ ] Unit tests cho all new functionality
- [ ] >80% coverage target
- [ ] Test edge cases
- [ ] Integration tests

### Documentation
- [ ] Update inline JSDoc
- [ ] Usage examples
- [ ] Migration guide

---

## 📈 Implementation Order

### Sprint 1: Core Infrastructure
1. SessionManager + types
2. SettingsManager + types  
3. AuthStorage + types
4. EventBus
5. Timings
6. CLI Args

### Sprint 2: Tools
1. BashTool
2. ReadTool
3. EditTool
4. WriteTool
5. GrepTool
6. FindTool
7. LsTool

### Sprint 3: Additional Features
1. Skills loading
2. Slash commands
3. Extensions loader
4. Compaction
5. Telemetry + Diagnostics

### Sprint 4: Polish
1. Refactor based on usage
2. Add tests
3. Documentation
4. Performance tuning

---

## ✅ Completion Criteria

- [ ] Tất cả legacy features có thể implement được
- [ ] Build passes: `npm run build` succeeds
- [ ] Test suite passes  
- [ ] Memory integration hoạt động
- [ ] Tools hoạt động đúng
- [ ] Sessions lưu/load được
- [ ] Settings persist được
- [ ] Auth credentials quản lý được

## 📝 Notes

- **KHÔNG copy code** từ legacy - reimplement concepts
- Architecture mới có thể khác nhưng đạt same goals
- Ưu tiên: correctness → performance → features
- Tham khảo AGENTS.md: "Professional, not playful"