# 📋 FULL TODO LIST - Picro Project

**Based on:** Comprehensive codebase analysis (52 tasks, 150+ files, 43K LOC)
**Git:** 235a388 (dev)
**Date:** 2025-05-03

---

## 📊 PROJECT OVERVIEW

**Monorepo:** 5 packages (npm workspaces)
- `packages/tui` - Terminal UI (⭐5/5, 94 files, 28K LOC)
- `packages/agent` - AI Agent (⭐5/5, 40+ files, 10K LOC)
- `packages/memory` - RAG System (8 files, 2K LOC)
- `packages/llm` - LLM Provider (800+ models, 23 providers)
- `packages/coding-agent` - Integration app

**Test Coverage:** ~5% (need 70%)
**CI/CD:** Not setup
**Typedoc:** Missing

---

## 🎯 PHASE 0: CRITICAL PRIORITY (Immediate)

### 🔴 P0 - Security & Stability
- [ ] **Fix empty catch blocks** in `packages/agent/src/tools/` (multiple tools have empty catches)
- [ ] **Replace all `any` types** with proper interfaces (TUI + Agent)
- [ ] **Resolve circular dependencies** (use depcruise to identify)
- [ ] **Add input validation** to all tool parameters (use typebox)
- [ ] **Sanitize user inputs** in bash/file operations (prevent injections)

### 🔴 P0 - Testing
- [ ] **Increase test coverage from 5% → 70%**
  - Agent: current ~5% → target 70% (149 tests → need 500+)
  - TUI: current ~10% → target 70% (157 tests → need 400+)
  - Memory: current 1 test → target 10+ tests
  - LLM: current ~15% → target 60% (77 tests → 200+)
- [ ] **Add integration tests** for tool execution pipeline
- [ ] **Add E2E tests** for agent session lifecycle
- [ ] **Setup test fixtures** and factories

---

## 🚀 PHASE 1: Code Quality (Weeks 1-2)

### 1.1 Type Safety
- [ ] Replace `any` in TUI components (`base.ts`, `tui.ts`, `terminal.ts`)
- [ ] Replace `any` in Agent (`agent.ts`, `session-manager.ts`, `tool-executor.ts`)
- [ ] Add strict `strictMode: true` in tsconfig for all packages
- [ ] Add `noImplicitAny: true`, `noImplicitReturns: true`
- [ ] Fix all TypeScript errors (currently 0 but strict mode will reveal)

### 1.2 Error Handling
- [ ] Audit all `try-catch` blocks in agent tools (bash, read, write, edit, etc.)
- [ ] Replace empty catches with proper logging + error propagation
- [ ] Add error boundaries in TUI components
- [ ] Add global error handler for uncaught exceptions
- [ ] Add graceful degradation for LLM API failures

### 1.3 Code Organization
- [ ] Extract circular dependencies in Agent (EventEmitter ↔ SessionManager ↔ ToolExecutor)
- [ ] Refactor large files (>500 LOC):
  - `packages/agent/src/session-manager.ts` (955 LOC) → split
  - `packages/tui/src/components/tui.ts` (1646 LOC) → split
  - `packages/tui/src/components/terminal.ts` (700+ LOC) → split
- [ ] Create clear module boundaries

---

## 📝 PHASE 2: Documentation (Weeks 2-3)

### 2.1 API Documentation
- [ ] **Setup Typedoc** for all packages (missing currently)
  - Configure typedoc.json for each package
  - Add JSDoc comments to all public APIs
  - Generate docs site (README badges)
- [ ] Document Agent:
  - AgentLoop strategies (ReAct, PlanSolve, Reflection)
  - Tool execution flow
  - Session branching API
  - Compaction policies
  - Extension API
- [ ] Document TUI:
  - Component lifecycle
  - Rendering engine (incremental 60fps)
  - Event system (mouse, keyboard)
  - Extension system
- [ ] Document Memory Engine:
  - BM25 algorithm parameters
  - Adaptive thresholds tuning
  - Forgetting policy
  - Caching strategy
- [ ] Document LLM:
  - Provider setup for each of 23 providers
  - Model pricing table
  - Rate limiting guidance

### 2.2 Guides & Tutorials
- [ ] **Getting Started tutorial for Agent** (step-by-step)
  - Installation
  - First agent setup
  - Adding custom tools
  - Session branching demo
  - Compaction demo
- [ ] **TUI Integration Guide** (how to embed TUI in apps)
- [ ] **Memory RAG Guide** (setup, tuning, best practices)
- [ ] **LLM Provider Guide** (23 providers, config examples)
- [ ] **Extension Development Guide** (build custom extensions)
- [ ] **Tool Development Guide** (create custom tools with validation)

### 2.3 Examples Gallery
- [ ] Create `examples/` directory with 10+ working demos:
  - [ ] Simple agent with bash tool
  - [ ] Agent with custom Python tool
  - [ ] Multi-session branching example
  - [ ] Memory RAG with file search
  - [ ] TUI standalone app (text editor)
  - [ ] TUI + Agent integration (full)
  - [ ] Extension example (custom UI component)
  - [ ] Parallel tool execution demo
  - [ ] Compaction policy demo
  - [ ] Custom tool with typebox validation
  - [ ] Docker sandboxing demo (if implemented)

---

## 🧪 PHASE 3: Testing & Quality (Weeks 3-4)

### 3.1 Unit Tests (Increase to 70% coverage)
- [ ] **Agent tests** (add 350+ tests):
  - [ ] AgentLoop unit tests (each strategy)
  - [ ] ToolExecutor tests (all 20 tools)
  - [ ] SessionManager tests (branching, compaction, serialization)
  - [ ] EventBus/EventEmitter tests
  - [ ] Extension loader/runner tests
  - [ ] Context manager tests
  - [ ] Compaction engine tests
- [ ] **TUI tests** (add 250+ tests):
  - [ ] Incremental renderer tests
  - [ ] All 68+ component tests
  - [ ] Mouse event handling
  - [ ] Accessibility (ARIA, RTL)
  - [ ] Theme system
  - [ ] Extension UIContext
- [ ] **Memory tests** (add 10+ tests):
  - [ ] BM25 retrieval accuracy
  - [ ] Adaptive thresholds tuning
  - [ ] Forgetting policy correctness
  - [ ] Cache invalidation
  - [ ] Concurrency safety
- [ ] **LLM tests** (add 120+ tests):
  - [ ] Provider integration (all 23)
  - [ ] Token estimation
  - [ ] Streaming responses
  - [ ] Error handling/retry
  - [ ] Model selection logic

### 3.2 Integration Tests
- [ ] **Agent + LLM integration** (end-to-end prompt → tool → response)
- [ ] **Agent + Memory integration** (context retrieval → LLM → compaction)
- [ ] **TUI + Agent integration** (full interactive mode)
- [ ] **Multi-session branching** (tree operations, swaps)
- [ ] **Tool execution pipeline** (bash → read → edit cycle)
- [ ] **Extension system** (load/unload, collisions)

### 3.3 E2E Tests
- [ ] **Full workflow:** User input → Agent planning → Tool execution → Final answer
- [ ] **Session persistence** (save/load/branch/merge)
- [ ] **Compaction** (token limit → summarize → continue)
- [ ] **Error recovery** (LLM timeout, tool failure)
- [ ] **Concurrent sessions** (multiple agents)

### 3.4 Test Infrastructure
- [ ] **Add test fixtures** (sample sessions, messages, tools)
- [ ] **Create test helpers** (mock LLM, mock tools, fake terminals)
- [ ] **Add property-based testing** (fast-check) for edge cases
- [ ] **Add snapshot testing** for TUI renders
- [ ] **Add code coverage reporting** (vitest --coverage → 70% target)
- [ ] **CI integration:** run tests on every PR

---

## 📦 PHASE 4: Build & CI/CD (Week 4)

### 4.1 Build System
- [ ] **Verify all packages build cleanly** (`npm run build` in each)
- [ ] **Add build validation** (no errors, no warnings)
- [ ] **Create release scripts** (`npm run release` per package)
- [ ] **Add bundle size analysis** (esbuild-bundle-size)
- [ ] **Optimize TUI bundle** (tree-shake unused components)

### 4.2 CI/CD Pipeline (NEW - currently missing)
- [ ] **Setup GitHub Actions** (`.github/workflows/`):
  - [ ] `ci.yml` - run tests on PR/push
  - [ ] `build.yml` - build all packages
  - [ ] `lint.yml` - ESLint + Prettier check
  - [ ] `coverage.yml` - enforce 70% coverage threshold
  - [ ] `release.yml` - automated package publishing
- [ ] **Add status badges** to READMEs (build, coverage, dependencies)
- [ ] **Setup Dependabot** (auto-update dependencies)
- [ ] **Add pre-commit hooks** (lint-staged):
  - [ ] Run ESLint
  - [ ] Run Prettier
  - [ ] Run type check
  - [ ] Run affected tests

### 4.3 Publishing
- [ ] **Prepare packages for npm:**
  - [ ] Add comprehensive READMEs (all 5 packages)
  - [ ] Add LICENSE headers to all source files
  - [ ] Add `files` field in package.json (already present)
  - [ ] Add `exports` map (already present)
  - [ ] Add `sideEffects: false` for tree-shaking
- [ ] **Setup npm registry:** (if internal, configure .npmrc)
- [ ] **Create release notes** template
- [ ] **Add changelog generation** (standard-version or changesets)

---

## 🛠️ PHASE 5: Critical Bug Fixes (Week 5)

### 5.1 Agent Package Fixes
- [ ] **Fix empty catch blocks** in tools:
  - `packages/agent/src/tools/bash.ts`
  - `packages/agent/src/tools/read.ts`
  - `packages/agent/src/tools/write.ts`
  - `packages/agent/src/tools/edit.ts`
  - `packages/agent/src/tools/glob.ts`
  - `packages/agent/src/tools/grep.ts`
  - `packages/agent/src/tools/ls.ts`
  - `packages/agent/src/tools/mkdir.ts`
  - `packages/agent/src/tools/mv.ts`
  - `packages/agent/src/tools/rm.ts`
- [ ] **Add error messages** to all catches (log error + propagate)
- [ ] **Add retry logic** for transient failures (network, timeouts)
- [ ] **Add timeout enforcement** for tool execution (avoid hangs)

### 5.2 TUI Package Fixes
- [ ] **Fix `any` types** in base components:
  - `base.ts` (Node, Box, Text)
  - `tui.ts` (main TUI class)
  - `terminal.ts` (terminal handling)
  - `input.ts` (input processing)
  - `editor.ts` (text editor)
- [ ] **Fix memory leaks** (check event listeners, subscriptions)
- [ ] **Fix rendering glitches** (incremental updates edge cases)
- [ ] **Add error boundaries** around all render calls

### 5.3 Memory Package Fixes
- [ ] **Add concurrency locking** for storage operations (avoid race conditions)
- [ ] **Fix cache invalidation bugs** (verify cache coherency)
- [ ] **Add size limits** to prevent OOM (max memories config)
- [ ] **Add corruption recovery** (invalid JSON in storage file)

### 5.4 LLM Package Fixes
- [ ] **Fix rate limiting** (all providers need retry with backoff)
- [ ] **Add request timeouts** (default 30s)
- [ ] **Fix token estimation** (use tiktoken or accurate counter)
- [ ] **Add circuit breaker** for failing providers

---

## 🔧 PHASE 6: Feature Improvements (Weeks 6-7)

### 6.1 Agent Enhancements
- [ ] **Tool Schema Validation** (use typebox)
  - [ ] Define JSON Schema for all tools (input/output)
  - [ ] Add runtime validation before tool execution
  - [ ] Generate TypeScript types from schemas
- [ ] **Token Estimation Caching**
  - [ ] Cache token counts for frequently used prompts
  - [ ] Use efficient tokenizer (tiktoken or similar)
  - [ ] Pre-compute for common tool results
- [ ] **Compaction Policy Engine**
  - [ ] Make compaction configurable (strategies: summarize, drop, keep-latest)
  - [ ] Add hooks for custom compaction logic
  - [ ] Add metrics (tokens saved, quality score)
- [ ] **Parallel Tool Execution**
  - [ ] Add concurrent tool runner with semaphore (max concurrency)
  - [ ] Support parallel independent tool calls
  - [ ] Add configurable concurrency limit (default 3)
  - [ ] Handle dependencies between tools

### 6.2 TUI Enhancements
- [ ] **Structured Logging** (replace console.log)
  - [ ] Integrate pino or winston
  - [ ] Add log levels (debug, info, warn, error)
  - [ ] Add structured fields (component, action, duration)
  - [ ] Add log file output option
- [ ] **File Locking for Concurrency**
  - [ ] Implement file-based locking for session files
  - [ ] Prevent race conditions in multi-process scenarios
  - [ ] Use `proper-lockfile` or similar
- [ ] **Accessibility Improvements**
  - [ ] Add screen reader announcements
  - [ ] Add keyboard navigation hints
  - [ ] Add high contrast theme
- [ ] **Performance Profiling**
  - [ ] Add built-in profiler (0x inspector integration)
  - [ ] Measure render times, event handling latency
  - [ ] Add profiling UI (toggle with keybinding)

### 6.3 Memory Enhancements
- [ ] **Configurable Adaptive Thresholds**
  - [ ] Make thresholds tunable per project
  - [ ] Add A/B testing framework for thresholds
  - [ ] Add feedback loop (user marks memories as relevant)
- [ ] **Advanced Forgetting Policies**
  - [ ] Add multiple policies: time-based, usage-based, importance-based
  - [ ] Allow custom policies via extension
  - [ ] Add dry-run mode (preview what would be forgotten)
- [ ] **Vector Embeddings** (optional)
  - [ ] Integrate embedding model (OpenAI embeddings, Cohere, etc.)
  - [ ] Add semantic search alongside BM25
  - [ ] Hybrid search (BM25 + vector)
- [ ] **Memory Export/Import**
  - [ ] Export memories to JSON/CSV
  - [ ] Import from external sources
  - [ ] Backup/restore functionality

### 6.4 LLM Enhancements
- [ ] **Add token estimation caching** (common prompts, system messages)
- [ ] **Add streaming UI** (real-time token generation display)
- [ ] **Add model benchmarking** (speed, cost, quality metrics)
- [ ] **Add provider health checking** (auto-failover)

---

## 🛡️ PHASE 7: Security & Sandboxing (Weeks 8-9)

### 7.1 Tool Sandboxing
- [ ] **Research sandboxing options** (Docker, Firecracker, gVisor)
- [ ] **Implement Docker sandbox** for bash/file tools:
  - [ ] Create minimal Docker image with common tools
  - [ ] Run all bash commands in sandboxed container
  - [ ] Enforce resource limits (CPU, memory, network)
  - [ ] Mount host directory read-only (except allowed paths)
- [ ] **Implement filesystem isolation:**
  - [ ] Whitelist allowed directories
  - [ ] Block access to sensitive paths (`/etc`, `/root`, `.ssh`)
  - [ ] Chroot or namespace isolation
- [ ] **Add network sandboxing:**
  - [ ] Block all outbound by default
  - [ ] Whitelist allowed domains (npm, github, etc.)
  - [ ] Add timeout for network operations

### 7.2 Tool Permissions
- [ ] **Implement least-privilege model:**
  - [ ] Tools declare required permissions (read, write, network, exec)
  - [ ] User approves permissions on first use
  - [ ] Store permissions per session/project
- [ ] **Add tool allowlist/blocklist:**
  - [ ] Configure which tools can run
  - [ ] Disable dangerous tools (rm, mv, mkdir) by default
  - [ ] Require confirmation for destructive operations
- [ ] **Add tool audit logging:**
  - [ ] Log all tool executions (who, when, what, result)
  - [ ] Store audit log securely
  - [ ] Add log rotation

### 7.3 Code Execution Safety
- [ ] **Add command whitelisting** (only pre-approved commands)
- [ ] **Add command blacklisting** (block dangerous patterns: `rm -rf`, `> /dev/`, etc.)
- [ ] **Add shell injection detection** (scan command strings before execution)
- [ ] **Add resource limits** (max execution time, max output size)
- [ ] **Add timeout enforcement** (kill long-running processes)

---

## 📊 PHASE 8: Observability & Monitoring (Week 10)

### 8.1 OpenTelemetry Tracing
- [ ] **Instrument all packages with OpenTelemetry:**
  - [ ] Agent: trace session lifecycle, tool execution, LLM calls
  - [ ] TUI: trace render cycles, event handling
  - [ ] Memory: trace retrieval, storage operations
  - [ ] LLM: trace provider calls, token usage
- [ ] **Setup tracing backend:**
  - [ ] Jaeger (local dev)
  - [ ] SigNoz/Grafana (production)
- [ ] **Add custom spans:**
  - [ ] Tool execution (name, duration, success/failure)
  - [ ] Memory retrieval (query, candidates, results)
  - [ ] Session branching (parent/child relationship)
  - [ ] Compaction (tokens before/after, duration)
- [ ] **Export traces** to console/file in dev mode

### 8.2 Structured Logging (Pino/Winston)
- [ ] **Replace all `console.log` with structured logger**
- [ ] **Add log levels** (debug, info, warn, error, fatal)
- [ ] **Add structured fields:**
  - `timestamp`, `level`, `message`, `component`, `action`, `duration`, `error`
- [ ] **Add log transport:**
  - [ ] Console (pretty print in dev)
  - [ ] File (rotate daily, max 7 days)
  - [ ] JSON (for log aggregation)
- [ ] **Add log filtering** (by component, level, timeframe)
- [ ] **Add PII scrubbing** (redact API keys, tokens, secrets)

### 8.3 Performance Profiling
- [ ] **Integrate 0x inspector** for production profiling:
  - [ ] CPU profiling (hot functions, flame graphs)
  - [ ] Memory profiling (heap snapshots, leaks detection)
  - [ ] Async tracking (promises, event loop)
- [ ] **Add built-in profiler UI** (toggle with `Ctrl+P`):
  - [ ] Show FPS meter (TUI rendering)
  - [ ] Show memory usage (heap size, count)
  - [ ] Show event loop lag
  - [ ] Show LLM API latency
  - [ ] Show tool execution times
- [ ] **Add performance benchmarks:**
  - [ ] Agent loop iteration time (target: <100ms)
  - [ ] Memory retrieval latency (target: <50ms)
  - [ ] TUI render time (target: 16ms for 60fps)
- [ ] **Add performance regression tests** (track metrics over time)

### 8.4 Metrics & Dashboards
- [ ] **Add Prometheus metrics endpoint** (if server mode):
  - [ ] `agent_sessions_total`
  - [ ] `agent_tools_executed_total`
  - [ ] `agent_tokens_used_total`
  - [ ] `memory_retrievals_total`
  - [ ] `tui_fps_current`
  - [ ] `tui_render_time_ms`
- [ ] **Add health check endpoint** (`/healthz`)
- [ ] **Create Grafana dashboard** with key metrics
- [ ] **Add alerting rules** (high error rate, slow LLM, low memory)

### 8.5 Memory Leak Detection
- [ ] **Add heap snapshot capture** (periodic, on-demand)
- [ ] **Add GC analysis** (detect objects not collected)
- [ ] **Add memory leak detection in production:**
  - [ ] Monitor heap growth over time
  - [ ] Alert if heap grows >10% per hour
  - [ ] Auto-trigger GC if memory >80%
- [ ] **Add `--detect-leaks` flag** to run with heap profiling
- [ ] **Add leak reports** to logs (suspect objects, retaining paths)

---

## 🔄 PHASE 9: Reliability & Resilience (Week 11)

### 9.1 Fault Tolerance
- [ ] **Add circuit breaker** for LLM API calls:
  - [ ] Open circuit after 5 failures
  - [ ] Half-open after 30s
  - [ ] Close after 10 successes
- [ ] **Add retry logic with exponential backoff:**
  - [ ] Network errors: retry 3x (1s, 2s, 4s)
  - [ ] Rate limit: retry 5x (respect Retry-After header)
  - [ ] Timeout: don't retry (user action required)
- [ ] **Add timeout enforcement:**
  - [ ] LLM call: 30s default
  - [ ] Tool execution: 60s default
  - [ ] Memory retrieval: 100ms default
- [ ] **Add fallback strategies:**
  - [ ] LLM fails → try alternative provider
  - [ ] Tool fails → try alternative tool (if available)
  - [ ] Session branch corrupted → restore from parent

### 9.2 Data Persistence
- [ ] **Add session auto-save:** every N minutes (configurable)
- [ ] **Add crash recovery:** recover unsaved sessions on startup
- [ ] **Add backup/restore:** manual backup to zip file
- [ ] **Add migration scripts:** auto-migrate old session format
- [ ] **Add corruption detection:** validate session file integrity (hash)

### 9.3 Concurrency Safety
- [ ] **Add file locking** for session files (prevent concurrent writes)
- [ ] **Add database transactions** (if using SQLite for sessions)
- [ ] **Add optimistic locking** (version numbers, CAS)
- [ ] **Add conflict resolution** for concurrent edits (merge or prompt)

---

## 📚 PHASE 10: Developer Experience (Week 12)

### 10.1 Developer Tools
- [ ] **Add debug mode** (`DEBUG=*`):
  - [ ] Verbose logging (all internal events)
  - [ ] Show event flow (AgentLoop steps)
  - [ ] Show tool inputs/outputs
  - [ ] Show memory retrieval details
  - [ ] Show LLM prompts/ responses
- [ ] **Add debug commands** in TUI:
  - [ ] `:debug` - toggle debug overlay
  - [ ] `:inspect` - inspect component tree
  - [ ] `:profile` - start/stop profiling
  - [ ] `:trace` - enable OpenTelemetry tracing
- [ ] **Add REPL mode** (eval TypeScript/JavaScript expressions)
- [ ] **Add hot reload** for extensions (watch + reload)

### 10.2 Error Messages
- [ ] **Improve error messages:**
  - [ ] Add actionable suggestions ("did you mean X?")
  - [ ] Add links to documentation
  - [ ] Add code examples for common errors
  - [ ] Add "copy to clipboard" for error details
- [ ] **Add error catalog** (known errors + solutions)
- [ ] **Add troubleshooting guide** (FAQ, common issues)

### 10.3 Configuration
- [ ] **Add config file schema validation** (JSON Schema + Ajv)
- [ ] **Add config examples** for common use cases:
  - [ ] Simple single-agent config
  - [ ] Multi-agent with specialized roles
  - [ ] Custom tool development
  - [ ] Production deployment
- [ ] **Add config wizard** (interactive setup)
- [ ] **Add config migration tool** (auto-update old configs)

### 10.4 IDE Integration
- [ ] **VS Code extension:**
  - [ ] Syntax highlighting for session files
  - [ ] Autocomplete for tool names/parameters
  - [ ] Debug adapter (breakpoints, step-through)
  - [ ] Inline error reporting
- [ ] **CLI autocomplete** (bash/zsh/fish)
- [ ] **Add language server** (LSP) for session files

---

## 🎨 PHASE 11: UI/UX Enhancements (Week 13)

### 11.1 TUI Improvements
- [ ] **Add themes gallery** (10+ pre-built themes: dark, light, solarized, dracula...)
- [ ] **Add theme editor** (create custom themes in-app)
- [ ] **Add color picker** for custom colors
- [ ] **Add font customization** (size, family, weight)
- [ ] **Add layout presets** (default, compact, wide, split)
- [ ] **Add panel management** (resize, move, close, restore)
- [ ] **Add session tabs** (multiple sessions side-by-side)
- [ ] **Add minimap** (overview of long conversations)
- [ ] **Add breadcrumbs** (show current depth in session tree)
- [ ] **Add search in conversation** (Ctrl+F, regex, case-sensitive)
- [ ] **Add export to format:**
  - [ ] Markdown
  - [ ] JSON
  - [ ] HTML (styled)
  - [ ] PDF (via puppeteer)
- [ ] **Add print mode** (compact text-only for printing)

### 11.2 Agent UX
- [ ] **Add progress indicators** for long-running tools:
  - [ ] Spinner with current step
  - [ ] Progress bar for file operations
  - [ ] ETA calculation
- [ ] **Add tool result preview** (before inserting into context):
  - [ ] Show truncated output
  - [ ] Confirm before adding large results (>1KB)
- [ ] **Add interactive confirmation** for destructive tools:
  - [ ] `rm`, `mv`, `rmdir` → require explicit "yes"
  - [ ] Show what will be deleted before confirming
- [ ] **Add tool suggestions** (based on current context):
  - [ ] "You're editing a Python file, want to run it?"
  - [ ] "You're in a git repo, want to check status?"
- [ ] **Add command palette** (Ctrl+P):
  - [ ] Quick tool execution
  - [ ] Quick session switch
  - [ ] Quick theme switch
  - [ ] Quick settings access

### 11.3 Session Management UX
- [ ] **Add visual session tree** (graph view of branches)
- [ ] **Add merge conflict resolution UI** (when merging branches)
- [ ] **Add diff viewer** (compare two session versions)
- [ ] **Add session timeline** (chronological view with markers)
- [ ] **Add session tags/labels** (organize by project, priority)
- [ ] **Add session search** (by content, tool, date, tag)
- [ ] **Add bulk operations** (delete multiple sessions, apply compaction)

---

## 📈 PHASE 12: Performance Optimization (Week 14)

### 12.1 TUI Performance
- [ ] **Profile render loops** (identify bottlenecks)
- [ ] **Optimize dirty region calculation** (reduce area to repaint)
- [ ] **Add virtual scrolling** for long lists (select-list, file-browser)
- [ ] **Add component memoization** (prevent re-render unchanged components)
- [ ] **Add batch updates** (coalesce multiple changes into one render)
- [ ] **Add lazy loading** for off-screen components
- [ ] **Add GPU acceleration** (WebGL terminal rendering, if possible)

### 12.2 Agent Performance
- [ ] **Profile LLM call latency** (measure per provider)
- [ ] **Add request batching** (combine multiple tool calls)
- [ ] **Add response streaming** (show partial results early)
- [ ] **Add token budget enforcement** (hard limit per session)
- [ ] **Add smart context windowing** (sliding window, not just compaction)
- [ ] **Add result caching** (identical prompts → cached response)
- [ ] **Add tool result caching** (identical inputs → cached output)

### 12.3 Memory Performance
- [ ] **Profile retrieval latency** (BM25 scoring optimization)
- [ ] **Add candidate pre-filtering** (metadata match to reduce scoring)
- [ ] **Add async retrieval** (don't block agent loop)
- [ ] **Add retrieval result caching** (same query → cache)
- [ ] **Add incremental indexing** (new memories indexed in background)
- [ ] **Add memory eviction tuning** (LRU + access frequency)

### 12.4 Bundle Size
- [ ] **Analyze bundle size** (esbuild-bundle-size, source-map-explorer)
- [ ] **Remove unused dependencies** (tree-shake, sideEffects: false)
- [ ] **Code split** (lazy load TUI components, tools)
- [ ] **Compress assets** (gzip/brotli for static files)
- [ ] **Add bundle visualizer** (webpack-bundle-analyzer equivalent)

---

## 🔐 PHASE 13: Security Hardening (Week 15)

### 13.1 Secrets Management
- [ ] **Add secret storage** (keytar or OS keychain)
- [ ] **Never log secrets** (redact API keys, tokens)
- [ ] **Add secret rotation** (periodic API key regeneration)
- [ ] **Add per-session encryption** (AES-256 for session files)
- [ ] **Add secure delete** (shred deleted sessions)

### 13.2 Access Control
- [ ] **Add session file permissions** (chmod 600)
- [ ] **Add multi-user support** (if applicable)
- [ ] **Add role-based access control** (admin, user, readonly)
- [ ] **Add audit trail** (who did what, when)
- [ ] **Add session sharing** (with permissions: view, edit, admin)

### 13.3 Network Security
- [ ] **Enforce HTTPS** for all provider API calls
- [ ] **Add certificate pinning** (for known providers)
- [ ] **Add proxy support** (HTTP/HTTPS/SOCKS5)
- [ ] **Add network timeout** (default 30s, configurable)
- [ ] **Add DNS resolution caching** (avoid DNS leaks)

### 13.4 Supply Chain Security
- [ ] **Audit dependencies** (npm audit, safety.db)
- [ ] **Update dependencies** (remove vulnerable packages)
- [ ] **Add SCA (Software Composition Analysis)** (Snyk, Dependabot)
- [ ] **Add SBOM generation** (Software Bill of Materials)
- [ ] **Add license compliance** (check for copyleft)

---

## 🌍 PHASE 14: Internationalization (i18n) (Week 16)

### 14.1 Translation
- [ ] **Extract all user-facing strings** to message catalogs
- [ ] **Add i18n framework** (i18next, formatjs)
- [ ] **Translate to Vietnamese** (primary language of dev)
- [ ] **Translate to English** (default)
- [ ] **Add language switcher** in TUI
- [ ] **Add RTL support** (Arabic, Hebrew)
- [ ] **Add pluralization rules** for each language
- [ ] **Add date/time/number formatting** per locale

### 14.2 Accessibility
- [ ] **Add screen reader support** (ARIA labels, live regions)
- [ ] **Add keyboard navigation** (all features accessible via keyboard)
- [ ] **Add high contrast mode** (WCAG AAA)
- [ ] **Add font scaling** (up to 200%)
- [ ] **Add screen reader announcements** for dynamic content
- [ ] **Test with NVDA/JAWS/VoiceOver**

---

## 🚀 PHASE 15: Production Readiness (Week 17)

### 15.1 Deployment
- [ ] **Create Docker image** (multi-stage build, minimal base)
- [ ] **Add Docker Compose** for easy setup (agent + LLM + DB)
- [ ] **Add Kubernetes manifests** (deployment, service, ingress)
- [ ] **Add Helm chart** (configurable, production-ready)
- [ ] **Add init containers** (wait for dependencies)
- [ ] **Add health checks** (liveness/readiness probes)
- [ ] **Add resource limits** (CPU, memory)
- [ ] **Add sidecar containers** (logging, monitoring)

### 15.2 Configuration Management
- [ ] **Add environment variable support** (12-factor app)
- [ ] **Add config file loading** (YAML/JSON/TOML)
- [ ] **Add config validation** (schema + defaults)
- [ ] **Add hot config reload** (SIGHUP or API)
- [ ] **Add config encryption** (sealed-secrets, HashiCorp Vault)
- [ ] **Add remote config** (Consul, etcd)

### 15.3 Backup & Recovery
- [ ] **Add automated backups** (daily to S3/GCS/Azure)
- [ ] **Add point-in-time recovery** (PITR for sessions)
- [ ] **Add backup verification** (test restore weekly)
- [ ] **Add retention policy** (keep 30d, 12mo, archive)
- [ ] **Add backup encryption** (at rest)
- [ ] **Add cross-region replication** (for HA)

### 15.4 Monitoring & Alerting
- [ ] **Setup Prometheus + Grafana** (scrape metrics)
- [ ] **Add alertmanager** (PagerDuty, Slack, email)
- [ ] **Define SLOs/SLIs:**
  - [ ] Availability: 99.9%
  - [ ] LLM latency: p95 < 5s
  - [ ] Tool success rate: >95%
  - [ ] Session corruption: 0%
- [ ] **Add dashboards:**
  - [ ] Agent throughput (sessions/hour)
  - [ ] LLM usage (tokens, cost)
  - [ ] Tool execution times
  - [ ] Memory retrieval latency
  - [ ] Error rates by component
- [ ] **Add anomaly detection** (sudden spike in errors, latency)

---

## 📚 PHASE 16: Community & Ecosystem (Week 18+)

### 16.1 Community
- [ ] **Create GitHub repository** (if not private)
- [ ] **Add MIT/Apache-2.0 LICENSE** (already Apache-2.0 in agent)
- [ ] **Add CONTRIBUTING.md** (guidelines, code style, PR process)
- [ ] **Add CODE_OF_CONDUCT.md** (community guidelines)
- [ ] **Add SECURITY.md** (vulnerability disclosure)
- [ ] **Add issue templates** (bug, feature, question)
- [ ] **Add pull request template** (checklist, tests required)
- [ ] **Add changelog** (keep a changelog format)

### 16.2 Documentation Site
- [ ] **Create docs site** (Docusaurus, VuePress, or VitePress)
- [ ] **Add quick start guide** (5-min setup)
- [ ] **Add API reference** (auto-generated from Typedoc)
- [ ] **Add tutorials** (step-by-step with code snippets)
- [ ] **Add FAQ** (frequently asked questions)
- [ ] **Add troubleshooting** (common problems + solutions)
- [ ] **Add architecture diagrams** (system overview, data flow)
- [ ] **Add video tutorials** (YouTube playlist)

### 16.3 Examples & Templates
- [ ] **Create template repository** (cookiecutter or degit)
- [ ] **Add project templates:**
  - [ ] Simple chatbot
  - [ ] Code reviewer
  - [ ] Documentation generator
  - [ ] Data analyzer
  - [ ] DevOps assistant
- [ ] **Add extension templates:**
  - [ ] Custom UI component
  - [ ] Custom tool
  - [ ] Custom compaction strategy
  - [ ] Custom LLM provider
- [ ] **Add real-world use cases:**
  - [ ] Personal assistant (daily tasks)
  - [ ] Code review bot (GitHub/GitLab)
  - [ ] Documentation updater
  - [ ] Bug triager

### 16.4 Ecosystem
- [ ] **Create plugin marketplace** (discover/share extensions)
- [ ] **Add extension rating/reviews** (community feedback)
- [ ] **Add extension verification** (official vs community)
- [ ] **Create extension SDK** (tools, types, docs)
- [ ] **Host extension contests** (hackathons, bounties)
- [ ] **Create Discord/Slack community** (chat, support)

---

## 🏆 PHASE 17: Advanced Features (Future)

### 17.1 AI/ML Enhancements
- [ ] **Add vector embeddings** (semantic memory search)
- [ ] **Add hybrid search** (BM25 + vector, re-ranking)
- [ ] **Add query understanding** (NLU to extract intent, entities)
- [ ] **Add automatic tool selection** (LLM decides which tool to use)
- [ ] **Add tool result summarization** (compress long outputs)
- [ ] **Add context-aware compaction** (importance weighting)
- [ ] **Add learning from feedback** (user corrections improve future)
- [ ] **Add few-shot learning** (store examples in memory)

### 17.2 Multi-Agent
- [ ] **Add multi-agent collaboration:**
  - [ ] Manager agent (delegates to specialists)
  - [ ] Specialist agents (code, docs, tests, review)
  - [ ] Debate mode (multiple agents argue → consensus)
  - [ ] Auction mode (agents bid on tasks)
- [ ] **Add agent team management:**
  - [ ] Create agent teams (by project)
  - [ ] Assign roles/responsibilities
  - [ ] Track team performance
  - [ ] Load balancing across agents
- [ ] **Add agent communication protocol:**
  - [ ] Message passing between agents
  - [ ] Shared memory space
  - [ ] Negotiation protocol

### 17.3 Cloud & Scale
- [ ] **Add multi-node support** (distributed agent cluster)
- [ ] **Add shared memory backend** (Redis, PostgreSQL with pgvector)
- [ ] **Add load balancer** (distribute sessions across nodes)
- [ ] **Add session migration** (move session between nodes)
- [ ] **Add horizontal scaling** (auto-scale based on load)
- [ ] **Add cloud deployment** (AWS, GCP, Azure templates)

### 17.4 Advanced UI
- [ ] **Add web UI** (React/Vue frontend)
- [ ] **Add desktop app** (Electron/Tauri)
- [ ] **Add mobile app** (React Native/Flutter)
- [ ] **Add voice interface** (speech-to-text, text-to-speech)
- [ ] **Add multi-modal:**
  - [ ] Image understanding (vision models)
  - [ ] Screenshot analysis
  - [ ] Video frame extraction
  - [ ] Audio transcription
- [ ] **Add 3D/VR interface** (future-looking)

---

## 📋 PHASE 18: Maintenance & Operations (Ongoing)

### 18.1 Dependency Management
- [ ] **Weekly:** Check for security updates (`npm audit`)
- [ ] **Monthly:** Update dependencies to latest minor versions
- [ ] **Quarterly:** Major version upgrades (test thoroughly)
- [ ] **Add automated PRs** (Dependabot, Renovate)
- [ ] **Maintain compatibility matrix** (Node versions, OS)

### 18.2 Performance Monitoring
- [ ] **Daily:** Check error rates (Sentry/DataDog)
- [ ] **Weekly:** Review performance dashboards
- [ ] **Monthly:** Performance regression tests
- [ ] **Quarterly:** Load testing (simulate 100+ concurrent users)

### 18.3 Security
- [ ] **Monthly:** Security audit (npm audit, Snyk)
- [ ] **Quarterly:** Penetration testing (external auditor)
- [ ] **Annually:** Code security review (internal team)

### 18.4 Documentation
- [ ] **Update docs** with every release
- [ ] **Keep changelog** current
- [ ] **Maintain migration guides** (breaking changes)
- [ ] **Update examples** for new features
- [ ] **Respond to community questions** (GitHub issues)

---

## 🎯 SUCCESS METRICS

**By end of Phase 12 (Production Ready), we should have:**

| Metric | Target | Current |
|--------|--------|---------|
| Test Coverage | 70% | ~5% |
| Documentation Coverage | 100% public APIs | 0% (Typedoc missing) |
| Examples Gallery | 10+ working examples | 0 |
| CI/CD Pipeline | ✅ Automated | ❌ Missing |
| Security Issues | 0 critical/high | TBD (audit needed) |
| Bug Count (open) | <10 | TBD |
| Performance: Agent Loop | <100ms/iter | TBD |
| Performance: TUI FPS | 60fps | ✅ Already 60fps |
| Memory Leaks | 0 detected | TBD |
| LLM Success Rate | >95% | TBD |
| Tool Execution Success | >98% | TBD |

---

## 📅 TIMELINE (Estimated)

- **Phase 0 (Critical):** Week 1
- **Phase 1 (Code Quality):** Week 1-2
- **Phase 2 (Documentation):** Week 2-3
- **Phase 3 (Testing):** Week 3-4
- **Phase 4 (Build/CI):** Week 4
- **Phase 5 (Bug Fixes):** Week 5
- **Phase 6 (Feature Improv.):** Week 6-7
- **Phase 7 (Security):** Week 8-9
- **Phase 8 (Observability):** Week 10
- **Phase 9 (Reliability):** Week 11
- **Phase 10 (DevEx):** Week 12
- **Phase 11 (UI/UX):** Week 13
- **Phase 12 (Performance):** Week 14
- **Phase 13 (Security Hardening):** Week 15
- **Phase 14 (i18n):** Week 16
- **Phase 15 (Production):** Week 17
- **Phase 16+ (Community):** Ongoing

**Total:** ~17 weeks (~4 months) to production-ready with full feature set.

---

## 🎯 PRIORITY ORDER (What to do FIRST)

### IMMEDIATE (This Week):
1. Fix empty catch blocks in agent tools (security/stability)
2. Add Typedoc (documentation foundation)
3. Increase test coverage (start with Agent core)
4. Setup CI/CD (GitHub Actions)

### NEXT 2 WEEKS:
5. Replace `any` types (type safety)
6. Resolve circular dependencies (code quality)
7. Add structured logging (debuggability)
8. Write Getting Started tutorial (onboarding)
9. Create examples gallery (developer experience)

### NEXT MONTH:
10. Increase test coverage to 70%
11. Tool schema validation (security)
12. Token estimation caching (performance)
13. File locking (concurrency safety)
14. Compaction policy engine (feature)
15. Parallel tool execution (performance)

---

## 📌 HOW TO USE THIS TODO LIST

1. **Start with Phase 0 (Critical):** Fix security bugs first
2. **Setup CI/CD early:** Enforce quality gates from day 1
3. **Document as you go:** Don't wait until end
4. **Test continuously:** Add tests with every feature
5. **Prioritize by impact:** Security > Stability > Features > Polish
6. **Track progress:** Mark tasks done in this file
7. **Review weekly:** Adjust priorities based on feedback

---

**Generated from:** Comprehensive codebase analysis (52 tasks, 150+ files, 43K LOC)
**Git commit:** 235a388 (feat: analysis reports)
**Status:** Ready to implement! 🚀
