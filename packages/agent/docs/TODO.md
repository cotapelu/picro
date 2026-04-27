# TODO: Agent Package Implementation - 🔄 IN PROGRESS

## 🎯 Mission

Build a professional, extensible agent framework that serves as the core logic for the pi-micro AI coding assistant.

**Nguyên tắc: Tham khảo legacy để hiểu requirements và behavior, sau đó implement hoàn toàn mới - KHÔNG copy code.**

> ⚠️ **IMPORTANT**: Legacy code chỉ dùng để THAM KHẢO, không được copy. Implement phải là code hoàn toàn mới với architecture tốt hơn nhưng đáp ứng đầy đủ tính năng.

---

## 📂 Legacy Code Reference

### Đường dẫn Legacy
```
/home/quangtynu/Qcoder/picro/packages/agent/pi-agent-legacy/
```

### Mapping Legacy → Current

| Legacy Path | Mô tả | Current Status | Ghi chú |
|-------------|-------|----------------|---------|
| `pi-agent-legacy/core/index.ts` | Core exports | ❌ Chưa có | Base Agent từ pi-agent-core |
| `pi-agent-legacy/core/agent.ts` | Agent class | ⚠️ Có khác | Current: `src/agent.ts` - architecture khác |
| `pi-agent-legacy/core/agent-loop.ts` | Agent loop | ✅ Có | Current: trong `src/agent-runner.ts` |
| `pi-agent-legacy/core/types.ts` | Core types | ⚠️ Có | Current: `src/types.ts`, `src/agent-types.ts` |
| `pi-agent-legacy/coding/core/agent-session.ts` | Session management (~3090 lines) | ❌ Chưa có | **CRITICAL - Chưa implement** |
| `pi-agent-legacy/coding/core/agent-session-runtime.ts` | Session runtime | ❌ Chưa có | **CRITICAL - Chưa implement** |
| `pi-agent-legacy/coding/core/agent-session-services.ts` | Session services | ❌ Chưa có | **CRITICAL - Chưa implement** |
| `pi-agent-legacy/coding/core/sdk.ts` | SDK createAgentSession | ❌ Chưa có | **CRITICAL - Chưa implement** |
| `pi-agent-legacy/coding/core/resource-loader.ts` | Resource loader | ❌ Chưa có | **CRITICAL - Chưa implement** |
| `pi-agent-legacy/coding/core/event-bus.ts` | Event bus | ✅ Có | Current: `src/event-bus.ts` |
| `pi-agent-legacy/coding/core/session-manager.ts` | Session manager | ✅ Có | Current: `src/session-manager.ts` |
| `pi-agent-legacy/coding/core/settings-manager.ts` | Settings manager | ✅ Có | Current: `src/settings-manager.ts` |
| `pi-agent-legacy/coding/core/auth-storage.ts` | Auth storage | ✅ Có | Current: `src/auth-storage.ts` |
| `pi-agent-legacy/coding/core/telemetry.ts` | Telemetry | ❌ Chưa có | **Chưa implement** |
| `pi-agent-legacy/coding/core/keybindings.ts` | Keybindings manager | ❌ Chưa có | **Chưa implement** |
| `pi-agent-legacy/coding/core/model-resolver.ts` | Model resolution | ❌ Chưa có | **CRITICAL - Chưa implement** |
| `pi-agent-legacy/coding/core/model-registry.ts` | Model registry | ❌ Chưa có | **CRITICAL - Chưa implement** |
| `pi-agent-legacy/coding/core/compaction/` | Compaction utilities | ⚠️ Có phần | Current: `src/compaction.ts` - thiếu branch-summarization |
| `pi-agent-legacy/coding/core/extensions/` | Extensions system | ❌ Chưa có | **CRITICAL - Chưa implement** |
| `pi-agent-legacy/coding/core/tools/index.ts` | Tools factory | ⚠️ Có phần | Current: `src/tools/index.ts` |
| `pi-agent-legacy/coding/core/tools/read.ts` | Read tool | ✅ Có | Current: `src/tools/read-tool.ts` |
| `pi-agent-legacy/coding/core/tools/write.ts` | Write tool | ✅ Có | Current: `src/tools/write-tool.ts` |
| `pi-agent-legacy/coding/core/tools/edit.ts` | Edit tool | ✅ Có | Current: `src/tools/edit-tool.ts` |
| `pi-agent-legacy/coding/core/tools/grep.ts` | Grep tool | ✅ Có | Current: `src/tools/grep-tool.ts` |
| `pi-agent-legacy/coding/core/tools/find.ts` | Find tool | ✅ Có | Current: `src/tools/find-tool.ts` |
| `pi-agent-legacy/coding/core/tools/ls.ts` | Ls tool | ✅ Có | Current: `src/tools/ls-tool.ts` |
| `pi-agent-legacy/coding/core/tools/bash.ts` | Bash tool | ❌ Chưa có | **CRITICAL - Chưa implement** |
| `pi-agent-legacy/coding/core/tools/file-mutation-queue.ts` | File mutation queue | ❌ Chưa có | **Chưa implement** |
| `pi-agent-legacy/coding/core/slash-commands.ts` | Slash commands | ✅ Có | Current: `src/slash-commands.ts` |
| `pi-agent-legacy/coding/core/skills.ts` | Skills | ✅ Có | Current: `src/skills.ts` |
| `pi-agent-legacy/coding/core/source-info.ts` | Source info | ❌ Chưa có | **Chưa implement** |
| `pi-agent-legacy/coding/core/prompt-templates.ts` | Prompt templates | ❌ Chưa có | **Chưa implement** |
| `pi-agent-legacy/coding/core/system-prompt.ts` | System prompt builder | ❌ Chưa có | **Chưa implement** |
| `pi-agent-legacy/coding/core/bash-executor.ts` | Bash executor | ❌ Chưa có | Có thể dùng shell utils |
| `pi-agent-legacy/coding/cli/args.ts` | CLI args | ✅ Có | Current: `src/cli-args.ts` |

---

## ✅ ĐÃ HOÀN THÀNH

### Phase 1: Core Infrastructure (6/6) ✅
- [x] SessionManager - Quản lý sessions với JSONL, tree structure, branching
- [x] SettingsManager - Settings với file locking, global/project scope, deep merge
- [x] AuthStorage - API keys, OAuth storage với auto-refresh, file locking
- [x] CLI Args - Full argument parsing, @fileArgs, help display
- [x] EventBus - Channel-based pub/sub events
- [x] Timings - Startup profiling với PI_TIMING=1

### Phase 2: Tools Implementation (7/7) ✅
- [x] ReadTool - Read files với text/image, offset/limit
- [x] WriteTool - Write files với auto-create dirs
- [x] GrepTool - Search content với ripgrep
- [x] FindTool - Find files với fd
- [x] LsTool - List directory với sorting
- [x] EditTool - Edit files với multiple edits, diff
- [ ] **BashTool** - Execute bash commands ❌ **CHƯA HOÀN THÀNH**

---

## 🔴 CÔNG VIỆC CẦN LÀM - FULL LIST

### Phase A: CRITICAL - Session & Runtime (Chưa có gì)

#### A1: AgentSession Class 🔴 CRITICAL
- **Legacy**: `pi-agent-legacy/coding/core/agent-session.ts` (~3090 lines)
- **Mô tả**: Core class quản lý vòng đời session, event subscription, model management, compaction, bash execution
- **File cần tạo**: `src/agent-session.ts`
- **Features cần implement**:
  - Session lifecycle management
  - Event subscription (subscribe/unsubscribe)
  - Model và thinking level management
  - Compaction (manual và auto)
  - Bash execution
  - Session switching và branching
  - Queue management (steering/follow-up)
  - Extension integration hooks
  - Retry logic
  - Skill block parsing

#### A2: AgentSessionRuntime 🔴 CRITICAL
- **Legacy**: `pi-agent-legacy/coding/core/agent-session-runtime.ts`
- **Mô tả**: Runtime wrapper quản lý session + cwd-bound services
- **File cần tạo**: `src/agent-session-runtime.ts`
- **Features cần implement**:
  - Session replacement (switch, new, fork)
  - Import from JSONL
  - Session teardown/shutdown events
  - Rebind session callbacks

#### A3: AgentSessionServices 🔴 CRITICAL
- **Legacy**: `pi-agent-legacy/coding/core/agent-session-services.ts`
- **Mô tả**: Tạo cwd-bound services cho runtime
- **File cần tạo**: `src/agent-session-services.ts`
- **Features cần implement**:
  - CreateAgentSessionServices options
  - CreateAgentSessionFromServices
  - Extension flag values handling
  - Diagnostics collection

#### A4: SDK (createAgentSession) 🔴 CRITICAL
- **Legacy**: `pi-agent-legacy/coding/core/sdk.ts`
- **Mô tả**: Public API để tạo AgentSession
- **File cần tạo**: `src/sdk.ts`
- **Features cần implement**:
  - `createAgentSession(options)` - main factory
  - `createAgentSessionServices(options)`
  - Tool factories (createBashTool, createCodingTools, etc.)
  - Tool name constants và types
  - Re-exports từ extensions

---

### Phase B: CRITICAL - Resources & Tools

#### B1: Resource Loader 🔴 CRITICAL
- **Legacy**: `pi-agent-legacy/coding/core/resource-loader.ts`
- **Mô tả**: Load extensions, skills, prompts, themes, context files
- **File cần tạo**: `src/resource-loader.ts`
- **Features cần implement**:
  - ResourceLoader interface
  - DefaultResourceLoader class
  - Load extensions với jiti
  - Load skills từ paths
  - Load prompt templates
  - Load themes
  - Load AGENTS.md/CLAUDE.md context files
  - System prompt discovery
  - Extension source info tracking
  - Conflict detection

#### B2: Bash Tool 🔴 CRITICAL
- **Legacy**: `pi-agent-legacy/coding/core/tools/bash.ts`
- **Mô tả**: Tool thực thi bash commands
- **File cần tạo**: `src/tools/bash-tool.ts`
- **Features cần implement**:
  - BashOperations interface (pluggable)
  - createLocalBashOperations()
  - createBashTool()
  - createBashToolDefinition()
  - Stream output với truncation
  - Timeout handling
  - Process tracking với trackDetachedChildPid
  - Schema definition

#### B3: File Mutation Queue
- **Legacy**: `pi-agent-legacy/coding/core/tools/file-mutation-queue.ts`
- **File cần tạo**: `src/tools/file-mutation-queue.ts`
- **Features cần implement**:
  - Queue file edits
  - Apply mutations atomically
  - Rollback on failure

#### B4: Source Info
- **Legacy**: `pi-agent-legacy/coding/core/source-info.ts`
- **File cần tạo**: `src/source-info.ts`
- **Features cần implement**:
  - SourceInfo type
  - createSyntheticSourceInfo()

#### B5: Prompt Templates
- **Legacy**: `pi-agent-legacy/coding/core/prompt-templates.ts`
- **File cần tạo**: `src/prompt-templates.ts`
- **Features cần implement**:
  - PromptTemplate type
  - loadPromptTemplates()
  - expandPromptTemplate()

#### B6: System Prompt Builder
- **Legacy**: `pi-agent-legacy/coding/core/system-prompt.ts`
- **File cần tạo**: `src/system-prompt.ts`
- **Features cần implement**:
  - BuildSystemPromptOptions
  - buildSystemPrompt()

---

### Phase C: CRITICAL - Model Management

#### C1: Model Registry 🔴 CRITICAL
- **Legacy**: `pi-agent-legacy/coding/core/model-registry.ts`
- **File cần tạo**: `src/model-registry.ts`
- **Features cần implement**:
  - ModelRegistry class
  - Provider registration
  - API key storage/retrieval
  - OAuth handling
  - Model availability checking

#### C2: Model Resolver 🔴 CRITICAL
- **Legacy**: `pi-agent-legacy/coding/core/model-resolver.ts`
- **File cần tạo**: `src/model-resolver.ts`
- **Features cần implement**:
  - resolveModelScope() - pattern matching
  - resolveCliModel() - CLI flags resolution
  - findInitialModel() - initial model selection
  - restoreModelFromSession() - session restoration
  - Model aliases và dated versions handling
  - Thinking level parsing

---

### Phase D: Extensions System 🔴 CRITICAL

#### D1: Extensions Loader
- **Legacy**: `pi-agent-legacy/coding/core/extensions/loader.ts`
- **File cần tạo**: `src/extensions/loader.ts`
- **Features cần implement**:
  - discoverAndLoadExtensions()
  - loadExtensions()
  - loadExtensionFromFactory()

#### D2: Extensions Runner
- **Legacy**: `pi-agent-legacy/coding/core/extensions/runner.ts`
- **File cần tạo**: `src/extensions/runner.ts`
- **Features cần implement**:
  - ExtensionRunner class
  - Event emission (agent_start, agent_end, tool_call, etc.)
  - Command registration/execution
  - Tool registration
  - Context management

#### D3: Extensions Types
- **Legacy**: `pi-agent-legacy/coding/core/extensions/types.ts`
- **File cần tạo**: `src/extensions/types.ts`
- **Features cần implement**:
  - Extension type definitions
  - ExtensionAPI interface
  - All event types (AgentToolResult, ToolCallEvent, etc.)
  - ExtensionFactory, ExtensionHandler
  - Type guards (isReadToolResult, etc.)

#### D4: Extensions Wrapper
- **Legacy**: `pi-agent-legacy/coding/core/extensions/wrapper.ts`
- **File cần tạo**: `src/extensions/wrapper.ts`
- **Features cần implement**:
  - wrapRegisteredTool()
  - wrapRegisteredTools()

#### D5: Extensions Index
- **Legacy**: `pi-agent-legacy/coding/core/extensions/index.ts`
- **File cần tạo**: `src/extensions/index.ts`
- **Features cần implement**:
  - Re-export all extension types và functions

---

### Phase E: Additional Features

#### E1: Telemetry
- **Legacy**: `pi-agent-legacy/coding/core/telemetry.ts`
- **File cần tạo**: `src/telemetry.ts`
- **Features cần implement**:
  - isInstallTelemetryEnabled()
  - PI_TELEMETRY environment check

#### E2: Keybindings Manager
- **Legacy**: `pi-agent-legacy/coding/core/keybindings.ts`
- **File cần tạo**: `src/keybindings.ts`
- **Features cần implement**:
  - KeybindingsManager class
  - 40+ keybinding definitions
  - Migration từ legacy config
  - User bindings loading/saving

#### E3: Auth Guidance
- **Legacy**: `pi-agent-legacy/coding/core/auth-guidance.ts`
- **File cần tạo**: `src/auth-guidance.ts`
- **Features cần implement**:
  - formatNoApiKeyFoundMessage()
  - formatNoModelSelectedMessage()
  - formatNoModelsAvailableMessage()

#### E4: Compaction Enhancement
- **Legacy**: `pi-agent-legacy/coding/core/compaction/`
- **Cập nhật**: `src/compaction.ts` thêm:
  - Branch summarization
  - Utils for token calculation

---

### Phase F: Polish

#### F1: JSDoc Comments
- Add JSDoc cho all public APIs

#### F2: README Updates
- Cập nhật documentation

---

## 📊 Files Đã Tạo

| Module | File |
|--------|------|
| SessionManager | `src/session-manager.ts` |
| SettingsManager | `src/settings-manager.ts` |
| AuthStorage | `src/auth-storage.ts` |
| CLI Args | `src/cli-args.ts` |
| EventBus | `src/event-bus.ts` |
| Timings | `src/timings.ts` |
| Tools | `src/tools/*.ts` (6/7 - thiếu BashTool) |
| Skills | `src/skills.ts` |
| Slash Commands | `src/slash-commands.ts` |
| Utils | `src/utils/*.ts` |
| Diagnostics | `src/diagnostics.ts` |
| Compaction | `src/compaction.ts` |
| Types | `src/agent-types.ts`, `src/types.ts` |

## 📊 Files Cần Tạo (Priority Order)

### Priority 1: CRITICAL (Session & Runtime)
- [ ] `src/agent-session.ts` (A1)
- [ ] `src/agent-session-runtime.ts` (A2)
- [ ] `src/agent-session-services.ts` (A3)
- [ ] `src/sdk.ts` (A4)

### Priority 2: CRITICAL (Resources & Tools)
- [ ] `src/resource-loader.ts` (B1)
- [ ] `src/tools/bash-tool.ts` (B2)
- [ ] `src/tools/file-mutation-queue.ts` (B3)
- [ ] `src/source-info.ts` (B4)
- [ ] `src/prompt-templates.ts` (B5)
- [ ] `src/system-prompt.ts` (B6)

### Priority 3: CRITICAL (Model)
- [ ] `src/model-registry.ts` (C1)
- [ ] `src/model-resolver.ts` (C2)

### Priority 4: CRITICAL (Extensions)
- [ ] `src/extensions/types.ts` (D3)
- [ ] `src/extensions/loader.ts` (D1)
- [ ] `src/extensions/runner.ts` (D2)
- [ ] `src/extensions/wrapper.ts` (D4)
- [ ] `src/extensions/index.ts` (D5)

### Priority 5: Additional
- [ ] `src/telemetry.ts` (E1)
- [ ] `src/keybindings.ts` (E2)
- [ ] `src/auth-guidance.ts` (E3)
- [ ] Cập nhật `src/compaction.ts` (E4)

### Priority 6: Polish
- [ ] JSDoc comments (F1)
- [ ] README updates (F2)

---

## ✅ Build & Tests

- **Build**: ✅ PASSED
- **Tests**: ✅ 126 passed

---

## 🎯 Priority Order

1. **AgentSession + Runtime + Services + SDK** - Để có public API hoàn chỉnh
2. **Resource Loader** - Để load extensions, skills, prompts
3. **Extensions System** - Hệ thống plugin cho pi-micro
4. **Bash Tool** - Tool quan trọng còn thiếu
5. **Model Registry + Resolver** - Quản lý models
6. **Các features còn lại**
7. **Polish**