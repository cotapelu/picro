# TUI Development TODO List

## Mục tiêu
Xây dựng thư mục `src/tui` đầy đủ và chuẩn, làm việc tốt với `AgentSessionRuntime`. Tham khảo code từ `llm-context/coding-agent/modes/interactive/` và `llm-context/agent/` nhưng KHÔNG copy, chỉ đối chiếu và implement theo cách phù hợp với kiến trúc hiện tại (React + Ink).

## Cập nhật gần đây (2025-05-26)
- ✅ **Iteration 9**: Bug Fix in `MessageItem.tsx` (shouldShowRole → showRoleLabel)
- ✅ **Iteration 10**: Added `MessageItem.test.tsx` (13 tests) - coverage increased to ~29.5%
- ✅ **Iteration 11**: Added tests for UserMessage, AssistantMessage, CommandPalette (29 tests total). Tests: 181 passing.
- ✅ **Iteration 12**: Added `ToolExecution.test.tsx` (6 tests). Tests: 187 passing.
- 📊 **Coverage**: ~29.5% statements (target 80%)
- 🔄 **Next Priorities**:
  1. Tiếp tục mở rộng test coverage: BashExecution, và các modals (Settings, Model, Session, etc.)
  2. Tích hợp `command-handlers.ts` & `modal-renderers.tsx` vào InkApp (decomposition)
  3. Implement theme watcher (dynamic light/dark switching)
  4. So sánh chi tiết với reference code (llm-context/coding-agent/modes/interactive/)

---

## 📊 Tình hình hiện tại

### Đã có (src/tui/ink)
- ✅ InkApp.tsx - React component chính với layout cơ bản
- ✅ useRuntime hook - kết nối basic với AgentSessionRuntime
- ✅ useTheme hook - theme management
- ✅ Các modals: CommandPalette, SettingsSelector, ModelSelector, ScopedModelsSelector, UserMessageSelector, SessionSelector, ThinkingModal, HelpModal, LoginModal, etc.
- ✅ Các components: Header, Footer (với FooterDataProvider), MessageList, MessageItem (User, Assistant, Tool, BashExecution, CompactionSummary, BranchSummary, Custom), InputBox
- ✅ Các molecule/organism: Armin, Daxnuts, EarendilAnnouncement, BorderedLoader, CountdownTimer
- ✅ types.ts - Message, ToolCall types (including special message roles)
- ✅ themes.ts - theme definitions
- ✅ ErrorBoundary

### Đã hoàn thành (so với interactive-mode.ts reference)
- ✅ Expanded `useRuntime` hook to expose comprehensive state & actions (isStreaming, isCompacting, retryAttempt, currentModel, thinkingLevel, steering/follow-up queues, etc.)
- ✅ Enhanced `Footer` component with `FooterDataProvider`: dynamic display of cwd, session name, model, thinking level, token stats (input/output/cache/cost), auto-compact indicator, hints, performance metrics
- ✅ Improved `ModelSelectorModal`: loads all available models from modelRegistry, supports search/filter, sets model via session.setModel(), shows reasoning support
- ✅ Implemented functional `SettingsSelectorModal` with most-used settings: theme, default thinking, transport, auto-compaction, hide thinking, show images, image width, skill commands, steering/follow-up modes, double escape action, quiet startup
- ✅ Added `/debug` command: writes debug log with messages and stats to temp file
- ✅ Added easter egg modals: `/arminsayshi` and `/dementedelves`
- ✅ Fixed build: TypeScript compilation clean, esbuild bundle OK
- ✅ `AssistantMessage` component: renders text content and thinking blocks (collapsible via hideThinkingBlock). Thinking blocks displayed italic with thinkingText color.
- ✅ `ToolExecution` component: displays tool call arguments and result with expand/collapse toggle.
- ✅ `BashExecution` component: displays ! command output with proper styling
- ✅ Compaction/Retry UI: Status line above footer shows compaction in progress and retry countdown.
- ✅ Tool output expansion toggle: Toggle via Ctrl+Shift+X, state managed in useRuntime.
- ✅ Pending messages indicator: Shows count of queued steering/follow-up messages (Ctrl+E to edit hint).
- ✅ **NEW: ScopedModelsSelectorModal**: React/Ink modal for selecting which models to cycle through (Ctrl+P). Supports toggle, reorder, enable/clear all, toggle provider, session-only changes persisted to settings via Ctrl+S.
- ✅ **NEW: UserMessageSelectorModal**: React/Ink modal for selecting a user message to fork from. Integrates with runtime.fork().
- ✅ **NEW: CompactionSummaryMessage, BranchSummaryMessage, CustomMessage components**: Properly renders special message types with appropriate formatting.
- ✅ Message type conversion updated to preserve role and fields for special message types in useRuntime hook.

### Đã hoàn thành thêm (TUI Enhancement Sprint)
- ✅ ScopedModelsSelectorModal (modal và handler)
- ✅ UserMessageSelectorModal (modal và handler)
- ✅ Missing message components: CompactionSummaryMessage, BranchSummaryMessage, CustomMessage
- ✅ FooterDataProvider để quản lý footer state tập trung
- ✅ Integration FooterDataProvider vào Footer và InkApp
- ✅ Cập nhật MessageItem để render các message type mới
- ✅ Cập nhật useRuntime converter để giữ nguyên các role đặc biệt
- ✅ Build successful

### Vẫn còn (tương tự interactive-mode.ts)
- ⏳ Unit tests: core utilities (output-guards, slash-commands) implemented; UI molecules cần test với ink-testing-library
- ⏳ SkillInvocationMessage component (chưa cần thiết nếu không dùng skills)
- ⏳ Complete extension system integration (setWidget, setHeader/Footer working but not fully tested)
- ⏳ Many command handlers stubs cần implement: `/export` (HTML), `/import` (JSONL), `/share` (GitHub gist), `/name` (session name), `/session` (stats), `/clone` (done: uses fork), `/tree` (branch navigation), `/resume` (session selector), `/compact` (calls session.compact)
- ⏳ Full extension bindings: bindExtensions() currently stub; cần implement command context actions, extension shortcuts
- ⏳ Signal handlers & graceful shutdown (SIGTERM, SIGHUP) trong TUI
- ⏳ Changelog display (read from file)
- ⏳ Autocomplete: fd-based path completion (done), slash commands (done), prompt templates (done), extension commands (done), skills (done)
- ⏳ Header resource loading display (counts of extensions, skills, prompts, themes, context files)
- ⏳ Theme watcher và dynamic theme switching
- ⏳ Many modals cần polish: SessionSelector (rename/delete), TreeSelector (summarization prompts), ScopedModelsSelector (improve UI hints)
- ⏳ Error handling và UX improvements (loading states, cancellation)
- ⏳ Performance optimization (large conversations, streaming)
- ⏳ Unit tests: core utilities (output-guards, slash-commands) implemented; UI molecules pending (need ink-testing-library)


---

## 🗂️ Phân loại công việc

### A. Core Architecture & Integration

#### A1. Runtime Integration
- [ ] **useRuntime hook**: Mở rộng để include đầy đủ AgentSessionRuntimeInterface
  - [ ] expose: `session`, `isStreaming`, `isCompacting`, `retryAttempt`, etc.
  - [ ] expose: `getSteeringMessages()`, `getFollowUpMessages()`, `clearQueue()`
  - [ ] expose: `getUserMessagesForForking()`, `getSessionStats()`, `getLastAssistantText()`
  - [ ] expose: `getToolDefinition(toolName)`
  - [ ] expose: `setAutoCompactionEnabled(enabled)`
  - [ ] expose: `setSteeringMode(mode)`, `setFollowUpMode(mode)`
  - [ ] expose: `cycleThinkingLevel()`, `cycleModel(direction)`, `setModel(model)`
  - [ ] expose: `getAvailableThinkingLevels()`
  - [ ] expose: `compact(customInstructions?)`
  - [ ] expose: `executeBash(command, onChunk, options)`
  - [ ] expose: `recordBashResult(command, result, options)`
  - [ ] expose: `abortBash()`
  - [ ] expose: `navigateTree(entryId, options)`, `getTree()`, `getLeafId()`
  - [ ] expose: `reload()`
  - [ ] expose: `getContextUsage()`

#### A2. InkApp Component
- [ ] **State management**: Expand state to include:
  - [ ] `loadingAnimation`, `workingMessage`, `workingIndicatorOptions`
  - [ ] `toolOutputExpanded`, `hideThinkingBlock`, `hiddenThinkingLabel`
  - [ ] `streamingComponent`, `streamingMessage`
  - [ ] `pendingTools` Map
  - [ ] `bashComponent`, `pendingBashComponents`
  - [ ] `autoCompactionLoader`, `retryLoader`, `retryCountdown`
  - [ ] `compactionQueuedMessages`
  - [ ] `extensionSelector`, `extensionInput`, `extensionEditor`
  - [ ] `extensionWidgetsAbove`, `extensionWidgetsBelow`
  - [ ] `customFooter`, `customHeader`
  - [ ] `changelogMarkdown`, `startupNoticesShown`
  - [ ] `anthropicSubscriptionWarningShown`
- [ ] **Layout**: Implement đầy đủ layout theo reference:
  - [ ] `headerContainer` (built-in or custom header)
  - [ ] `chatContainer`
  - [ ] `pendingMessagesContainer`
  - [ ] `statusContainer`
  - [ ] `widgetContainerAbove`, `widgetContainerBelow`
  - [ ] `editorContainer` (với editor có thể thay đổi)
  - [ ] `footer`
- [ ] **Key handlers**: Implement tất cả key handlers từ interactive-mode.ts:
  - [ ] `onEscape`, `onCtrlD`, `onCtrlC` (double-tap), `onCtrlZ`
  - [ ] Actions: `app.clear`, `app.suspend`, `app.thinking.cycle`, `app.model.*`, `app.tools.expand`, `app.thinking.toggle`, `app.editor.external`, `app.message.followUp`, `app.message.dequeue`, `app.clipboard.pasteImage`
  - [ ] Extension shortcuts integration
- [ ] **Editor submit handler**: Xử lý tất cả slash commands và bash
- [ ] **Signal handlers**: `registerSignalHandlers()`, `unregisterSignalHandlers()`, handle SIGTERM, SIGHUP, SIGCONT
- [ ] **Shutdown**: `shutdown()`, `checkShutdownRequested()`, `stop()`

#### A3. Agent Event Subscription
- [ ] `subscribeToAgent()`: Subscribe to `AgentSessionRuntimeEvent`
- [ ] `handleEvent(event)`: Xử lý tất cả event types:
  - [ ] `agent_start` → show loader/status
  - [ ] `agent_end` → hide loader, check shutdown, flush queues
  - [ ] `queue_update` → update pending messages display
  - [ ] `message_start` → create AssistantMessageComponent với streaming
  - [ ] `message_update` → update streaming content, handle tool calls
  - [ ] `message_end` → finalize, handle errors
  - [ ] `tool_execution_start` → create/update ToolExecutionComponent
  - [ ] `tool_execution_update` → update partial result
  - [ ] `tool_execution_end` → mark complete
  - [ ] `compaction_start` → show compaction loader, set escape handler
  - [ ] `compaction_end` → rebuild chat, show summary
  - [ ] `auto_retry_start` → show retry countdown, set escape handler
  - [ ] `auto_retry_end` → restore escape, show error nếu fail

---

### B. Components Implementation/Completion

#### B1. AssistantMessage Component (molecule)
- [ ] **File**: `src/tui/ink/components/MessageItem/AssistantMessage.tsx` (new)
- [ ] Props: `message`, `hideThinkingBlock`, `markdownTheme`, `hiddenThinkingLabel`
- [ ] Methods: `setHideThinkingBlock()`, `setHiddenThinkingLabel()`, `updateContent(message)`
- [ ] Render:
  - [ ] text blocks (Markdown)
  - [ ] thinking blocks (collapsible, italic, thinkingText color)
  - [ ] tool calls (không render trực tiếp, được render riêng)
  - [ ] stopReason: aborted/error
- [ ] Streaming support: Có thể update content incrementally (giữ lại reference để update)

#### B2. ToolExecution Component (molecule) - enhancement
- [ ] **File**: `src/tui/ink/components/MessageItem/ToolExecution.tsx` (modify)
- [ ] Add: `setExpanded(expanded)`
- [ ] Add: `setShowImages(show)`, `setImageWidthCells(width)`
- [ ] Add: `markExecutionStarted()`
- [ ] Add: `setArgsComplete()`
- [ ] Add: `updateArgs(args)`, `updateResult(result, isPartial)`
- [ ] Support built-in tool definitions từ `createAllToolDefinitions(cwd)`
- [ ] Support custom tool definitions từ extensions
- [ ] Render:
  - [ ] Call renderer (renderCall) nếu có
  - [ ] Result renderer (renderResult) nếu có
  - [ ] Fallback: title + JSON args + text output
  - [ ] Image display với maxWidthCells, conversion cho Kitty
- [ ] Background color: pending/error/success theo theme

#### B3. BashExecution Component (molecule) - new
- [ ] **File**: `src/tui/ink/components/MessageItem/BashExecution.tsx` (new)
- [ ] Props: `command`, `ui`, `excludeFromContext`
- [ ] Methods: `appendOutput(chunk)`, `setComplete(exitCode, cancelled, truncation?, fullOutputPath?)`
- [ ] Render: command + output with appropriate styling (error if non-zero exit)
- [ ] Truncation support (visual truncate indicator)

#### B4. UserMessage Component (molecule) - simple
- [ ] **File**: `src/tui/ink/components/MessageItem/UserMessage.tsx` (new)
- [ ] Props: `text`, `markdownTheme`
- [ ] Render: markdown of text content (không cần expand/collapse)

#### B5. SkillInvocationMessage Component (molecule) - new
- [ ] **File**: `src/tui/ink/components/MessageItem/SkillInvocationMessage.tsx` (new)
- [ ] Props: `skillBlock` (từ `parseSkillBlock()`), `markdownTheme`
- [ ] Render: skill name + arguments, có thể expand to show user message

#### B6. CustomMessage Component (molecule) - new
- [ ] **File**: `src/tui/ink/components/MessageItem/CustomMessage.tsx` (new)
- [ ] Props: `message`, `renderer` (từ extensionRunner.getMessageRenderer), `markdownTheme`
- [ ] Render custom content qua renderer

#### B7. CompactionSummaryMessage Component (molecule) - new
- [ ] **File**: `src/tu/ink/components/MessageItem/CompactionSummaryMessage.tsx` (new)
- [ ] Props: `message` (từ `createCompactionSummaryMessage()`), `markdownTheme`
- [ ] Render summary, có thể expand

#### B8. BranchSummaryMessage Component (molecule) - new
- [ ] **File**: `src/tui/ink/components/MessageItem/BranchSummaryMessage.tsx` (new)
- [ ] Props: `message`, `markdownTheme`
- [ ] Render branch summary

#### B9. Other Static Components (already exist, cần kiểm tra)
- [ ] `Armin` ✅ có
- [ ] `Daxnuts` ✅ có
- [ ] `EarendilAnnouncement` ✅ có
- [ ] `DynamicBorder` ✅ có
- [ ] `BorderedLoader` ✅ có
- [ ] `CountdownTimer` ✅ có

---

### C. Selectors & Dialogs (molecules/organisms)

#### C1. Settings Selector ( molecule)
- [ ] **File**: `src/tui/ink/modals/SettingsSelectorModal.tsx` (modify/complete)
- [ ] Props: `runtime`, `onClose`
- [ ] State: all settings từ SettingsManager:
  - [ ] `autoCompact`, `showImages`, `imageWidthCells`, `autoResizeImages`, `blockImages`
  - [ ] `enableSkillCommands`, `steeringMode`, `followUpMode`, `transport`
  - [ ] `defaultThinkingLevel`, `availableThinkingLevels`
  - [ ] `currentTheme`, `availableThemes`
  - [ ] `hideThinkingBlock`, `collapseChangelog`, `enableInstallTelemetry`
  - [ ] `doubleEscapeAction`, `treeFilterMode`
  - [ ] `showHardwareCursor`, `editorPaddingX`, `autocompleteMaxVisible`
  - [ ] `quietStartup`, `clearOnShrink`, `showTerminalProgress`
- [ ] Callbacks: tất cả `on*Change` để cập nhật session/settings
- [ ] Theme preview functionality
- [ ] Render: list với checkboxes/toggles/selects

#### C2. Model Selector ( molecule)
- [ ] **File**: `src/tui/ink/modals/ModelSelectorModal.tsx` (modify/complete)
- [ ] Props: `runtime`, `onClose`, `initialSearchInput?`
- [ ] Fetch models từ `session.modelRegistry.getAvailable()`
- [ ] Support scoped models (nếu có)
- [ ] Search/filter by provider/name
- [ ] Show current model, thinking level
- [ ] On select: `session.setModel(model)`, update footer, border, maybe warn about anthropic subscription
- [ ] Easter egg: check daxnuts for OpenCode Kimi

#### C3. Scoped Models Selector ( molecule) - new
- [ ] **File**: `src/tui/ink/modals/ScopedModelsSelectorModal.tsx` (new)
- [ ] Props: `onChange`, `onPersist`, `onCancel`
- [ ] Input: `allModels`, `enabledModelIds`
- [ ] UI: list models với checkboxes, search
- [ ] onChange: update session.scopedModels
- [ ] onPersist: save to settings

#### C4. Session Selector ( molecule)
- [ ] **File**: `src/tui/ink/modals/SessionSelectorModal.tsx` (modify/complete)
- [ ] Props: `runtime`, `onClose`
- [ ] Fetch sessions từ `SessionManager.list()` và `listAll()`
- [ ] Render: searchable list, show name/path/cwd/modified
- [ ] Actions:
  - [ ] Resume (enter)
  - [ ] Rename (Ctrl+R hoặc button)
  - [ ] Delete (Ctrl+D hoặc button) với confirmation
  - [ ] New session (Ctrl+N)
- [ ] Integration: `runtime.switchSession(path)`, `SessionManager.appendSessionInfo()`

#### C5. Tree Selector ( molecule)
- [ ] **File**: `src/tui/ink/modals/TreeSelectorModal.tsx` (modify/complete)
- [ ] Props: `runtime`, `onClose`
- [ ] Data: `sessionManager.getTree()`, `getLeafId()`, `terminalRows`
- [ ] UI: tree view với indentation, labels, summary indicators
- [ ] On select: navigate tree với summarization prompt:
  - [ ] "No summary"
  - [ ] "Summarize"
  - [ ] "Summarize with custom prompt" → open extension editor
- [ ] Show loader, cancelable during summarization
- [ ] Label editing on the fly

#### C6. UserMessage Selector ( molecule)
- [ ] **File**: `src/tui/ink/modals/UserMessageSelectorModal.tsx` (modify/complete)
- [ ] Props: `messages` (array of {id, text}), `onSelect`, `onCancel`, `initialSelectedId?`
- [ ] UI: searchable list of user messages
- [ ] On select: `runtime.fork(entryId)`, render new session

#### C7. Extension Selector ( molecule) - new
- [ ] **File**: `src/tui/ink/components/ExtensionSelector.tsx` (new)
- [ ] Props: `title`, `options` (string[]), `onSelect(option)`, `onCancel`, `{ tui, timeout? }`
- [ ] UI: simple list với highlight, enter to select, esc to cancel
- [ ] Focus management

#### C7. Extension Input ( molecule) - new
- [ ] **File**: `src/tui/ink/components/ExtensionInput.tsx` (new)
- [ ] Props: `title`, `placeholder?`, `onSubmit(value)`, `onCancel`, `{ tui, timeout? }`
- [ ] UI: InputBox with label, submit on Enter, cancel on Esc

#### C8. Extension Editor ( molecule) - new
- [ ] **File**: `src/tui/ink/components/ExtensionEditor.tsx` (new)
- [ ] Props: `title`, `prefill?`, `onSubmit(value)`, `onCancel`, `{ tui, keybindings }`
- [ ] UI: CustomEditor with multiline, Ctrl+G to submit

#### C9. Login Dialog ( molecule)
- [ ] **File**: `src/tui/ink/modals/LoginModal.tsx` (modify/complete)
- [ ] Props: `onLogin(apiKey)`, `onClose`
- [ ] State: current step (auth, prompt, manual input, progress, info)
- [ ] Methods: `showAuth()`, `showPrompt()`, `showManualInput()`, `showProgress()`, `showInfo()`, `signal` for abort
- [ ] Integration với `authStorage.login()`

#### C10. Confirm Dialog ( molecule) - new
- [ ] **File**: `src/tui/ink/modals/ConfirmationModal.tsx` (new)
- [ ] Props: `title`, `message`, `onConfirm`, `onCancel?`
- [ ] UI: Yes/No buttons, Enter/Esc handling

---

### D. Extension System

#### D1. ExtensionUIContext Implementation
- [ ] **File**: `src/tui/extension-ui-context.impl.ts` (new)
- [ ] Implement interface `ExtensionUIContext`:
  - [ ] `select(title, options, opts?)`: Promise<string | undefined>
  - [ ] `confirm(title, message, opts?)`: Promise<boolean>
  - [ ] `input(title, placeholder?, opts?)`: Promise<string | undefined>
  - [ ] `notify(message, type?)`: void (toast/status)
  - [ ] `onTerminalInput(handler)`: () => void (unsubscribe)
  - [ ] `setStatus(key, text)`: Update footer extension status
  - [ ] `setWorkingMessage(message)`
  - [ ] `setWorkingIndicator(options?)`
  - [ ] `setHiddenThinkingLabel(label)`
  - [ ] `setWidget(key, content, options?)`: content can be string[] | factory
  - [ ] `setFooter(factory?)`
  - [ ] `setHeader(factory?)`
  - [ ] `setTitle(title)`
  - [ ] `custom(factory, options?)`: Show custom overlay/embedded
  - [ ] `pasteToEditor(text)`
  - [ ] `setEditorText(text)`, `getEditorText()`
  - [ ] `editor(title, prefill?)`: Promise<string | undefined>
  - [ ] `addAutocompleteProvider(factory)`
  - [ ] `setEditorComponent(factory)`
  - [ ] `theme` getter
  - [ ] `getAllThemes()`, `getTheme(name)`, `setTheme(themeOrName)`
  - [ ] `getToolsExpanded()`, `setToolsExpanded(expanded)`

#### D2. Extension Integration trong InkApp
- [ ] `createExtensionUIContext()`: Return implementation với closure over InkApp instance
- [ ] `bindCurrentSessionExtensions()`:
  - [ ] `session.bindExtensions({ uiContext, commandContextActions, shutdownHandler, onError })`
  - [ ] `commandContextActions`: `waitForIdle`, `newSession`, `fork`, `navigateTree`, `switchSession`, `reload`
  - [ ] Setup extension runner shortcuts: `setupExtensionShortcuts()`
  - [ ] Show loaded resources: `showLoadedResources()`
  - [ ] Setup autocomplete: `setupAutocompleteProvider()`
  - [ ] Theme registration: `setRegisteredThemes()`
- [ ] `resetExtensionUI()`: Cleanup tất cả extension state
- [ ] Error display: `showExtensionError(extensionPath, error, stack)`

---

### E. Footer System

#### E1. FooterDataProvider (new)
- [ ] **File**: `src/tui/ink/components/Footer/FooterDataProvider.ts` (new)
- [ ] Class implements `ReadonlyFooterDataProvider` interface
- [ ] Properties:
  - [ ] `cwd` (update when switch session)
  - [ ] `model` (từ session.model?.id ?? 'No model')
  - [ ] `thinkingLevel` (từ session.thinkingLevel)
  - [ ] `tokens` (input/output/total từ usage)
  - [ ] `isStreaming`, `isCompacting`
  - [ ] `autoCompactionEnabled`
  - [ ] `availableProviderCount`
  - [ ] Extension statuses (map key → text)
- [ ] Methods: `setCwd()`, `setModel()`, `setThinkingLevel()`, `setTokens()`, `setExtensionStatus()`, `clearExtensionStatuses()`, `invalidate()`, `dispose()`

#### E2. Footer Component (enhance)
- [ ] **File**: `src/tui/ink/components/Footer/Footer.tsx` (modify)
- [ ] Props: `session`, `footerDataProvider`
- [ ] Methods:
  - [ ] `setSession(session)`
  - [ ] `setAutoCompactEnabled(enabled)`
  - [ ] `setLeftItems(items)`, `setRightItems(items)`
  - [ ] `invalidate()`, `dispose()`
- [ ] Render:
  - [ ] Left: cwd basename, session name nếu có
  - [ ] Center: model, thinking level
  - [ ] Right: tokens, provider count, extension statuses, auto-compact badge
  - [ ] Hints: dynamic hints từ KeybindingsManager

---

### F. Command Handlers (trong InkApp)

- [ ] `/settings` → showSettingsSelector()
- [ ] `/model` hoặc `/model <search>` → handleModelCommand(searchTerm?)
- [ ] `/scoped-models` → showModelsSelector()
- [ ] `/export` hoặc `/export <path>` → handleExportCommand() (HTML/JSONL)
- [ ] `/import` hoặc `/import <path>` → handleImportCommand()
- [ ] `/share` → handleShareCommand() (gh gist)
- [ ] `/copy` → handleCopyCommand() (last assistant)
- [ ] `/name` hoặc `/name <name>` → handleNameCommand()
- [ ] `/session` → handleSessionCommand() (stats)
- [ ] `/changelog` → handleChangelogCommand()
- [ ] `/hotkeys` → handleHotkeysCommand()
- [ ] `/fork` → showUserMessageSelector()
- [ ] `/clone` → handleCloneCommand()
- [ ] `/tree` → showTreeSelector()
- [ ] `/login` → showOAuthSelector("login")
- [ ] `/logout` → showOAuthSelector("logout")
- [ ] `/new` → handleClearCommand()
- [ ] `/compact` hoặc `/compact <instructions>` → handleCompactCommand()
- [ ] `/reload` → handleReloadCommand()
- [ ] `/debug` → handleDebugCommand() (write debug log)
- [ ] `/arminsayshi` → handleArminSaysHi()
- [ ] `/dementedelves` → handleDementedDelves()
- [ ] `/quit` → shutdown()

#### Helper methods:
- [ ] `getPathCommandArgument(text, command)`: parse path từ args
- [ ] `checkDaxnutsEasterEgg(model)`
- [ ] `maybeWarnAboutAnthropicSubscriptionAuth(model)`
- [ ] `updateAvailableProviderCount()`

---

### G. Runtime Utilities (modify/complete)

- [ ] `applyRuntimeSettings()`: Apply settings to UI (editor padding, autocomplete max, cursor, clearOnShrink, theme, etc.)
- [ ] `rebindCurrentSession()`: Gọi applyRuntimeSettings + bindExtensions + subscribe + update editor/title
- [ ] `renderCurrentSessionState()`: Clear containers, rebuild chat
- [ ] `rebuildChatFromMessages()`: Build từ SessionContext
- [ ] `renderInitialMessages()`: Build context, populate history, show compaction info
- [ ] `addMessageToChat(message, options?)`: Switch on message.role → create component phù hợp
- [ ] `showLoadedResources(options?)`: Display loaded skills, prompts, extensions, themes, context files, diagnostics
- [ ] `buildScopeGroups()`, `formatScopeGroups()`: Helper để group extensions/skills/prompts by scope
- [ ] `getChangelogForDisplay()`: Only show new entries, skip for resumed sessions
- [ ] `checkForNewVersion()`: Fetch npm, compare
- [ ] `checkForPackageUpdates()`: Dùng DefaultPackageManager
- [ ] `checkTmuxKeyboardSetup()`: Check tmux extended-keys
- [ ] `updateTerminalTitle()`
- [ ] `cycleModel(direction)`
- [ ] `cycleThinkingLevel()`
- [ ] `toggleToolOutputExpansion()`, `setToolsExpanded(expanded)`
- [ ] `toggleThinkingBlockVisibility()`
- [ ] `openExternalEditor()`
- [ ] `handleClipboardImagePaste()`
- [ ] `getAppKeyDisplay()`, `getEditorKeyDisplay()`

---

### H. Message Queue & Compaction

- [ ] `queueCompactionMessage(text, mode)`
- [ ] `getAllQueuedMessages()`
- [ ] `clearAllQueues()`
- [ ] `updatePendingMessagesDisplay()`: Show steering/follow-up messages with dequeue hint
- [ ] `restoreQueuedMessagesToEditor(options?)`: Move queued messages back to editor
- [ ] `flushCompactionQueue(options?)`: Send queued messages after compaction

---

### I. Widgets & Custom UI

- [ ] `MAX_WIDGET_LINES = 10`
- [ ] `setExtensionWidget(key, content, options?)`: Support string[] | factory
- [ ] `clearExtensionWidgets()`
- [ ] `renderWidgets()`: Render above/below containers
- [ ] `setExtensionFooter(factory?)`: Replace default footer
- [ ] `setExtensionHeader(factory?)`: Replace default header
- [ ] `showExtensionCustom(factory, options?)`: Overlay or embedded
- [ ] `addExtensionTerminalInputListener(handler)`, `clearExtensionTerminalInputListeners()`
- [ ] `setCustomEditorComponent(factory?)`: Swap editor (copy handlers từ default)

---

### J. Bash Execution

- [ ] `handleBashCommand(command, excludeFromContext)`
- [ ] Integration với `extensionRunner.emitUserBash()`
- [ ] Show component trong pending area nếu streaming, chat nếu idle
- [ ] Stream output, handle truncation, exit code, cancellation

---

### K. Other Features

- [ ] **Autocomplete**:
  - [ ] `createBaseAutocompleteProvider()`: Slash commands + templates + extensions + skills
  - [ ] `setupAutocompleteProvider()`: Apply wrappers
  - [ ] `getAutocompleteSourceTag(sourceInfo)`, `prefixAutocompleteDescription()`
  - [ ] `fdPath` từ `ensureTool("fd")` (có thể cần thêm vào runtime)
- [ ] **Theme**:
  - [ ] `getMarkdownThemeWithSettings()` dùng `settingsManager.getCodeBlockIndent()`
  - [ ] Theme watcher: `onThemeChange()` invalidate UI
- [ ] **Models**:
  - [ ] `findExactModelMatch(searchTerm)`: use `findExactModelReferenceMatch`
  - [ ] `getModelCandidates()`: scoped or all
- [ ] **Login/Logout**:
  - [ ] `getLoginProviderOptions(authType?)`, `getLogoutProviderOptions()`
  - [ ] `showLoginAuthTypeSelector()`, `showLoginProviderSelector(authType)`
  - [ ] `completeProviderAuthentication()`
  - [ ] `showBedrockSetupDialog()`, `showApiKeyLoginDialog()`, `showLoginDialog()`
- [ ] **Easter eggs**: `handleArminSaysHi()`, `handleDementedDelves()`, `handleDaxnuts()`

---

### L. Testing

- [ ] Unit tests cho tất cả components (atoms/molecules/organisms)
- [ ] Integration tests cho InkApp với mock runtime
- [ ] Test agent event handling (streaming, tool execution, compaction, retry)
- [ ] Test command handlers
- [ ] Test extension system (UIContext, widgets, shortcuts)
- [ ] Test selectors & dialogs
- [ ] Test autocomplete
- [ ] Test key handlers
- [ ] Test signal handlers & shutdown
- [ ] Edge cases: empty states, errors, truncation, cancellation
- [ ] Performance tests (large conversations)

---

### M. Documentation

- [ ] README cho src/tui package
- [ ] API docs cho components, hooks, types
- [ ] Guide để mở rộng TUI với extensions
- [ ] Guide để thêm selectors/commands mới

---

## ✅ Đã hoàn thành (tính đến 2025-05-22)

### C. Runtime Integration & Core UI
- [x] **useRuntime hook**: Mở rộng state + actions (isStreaming, isCompacting, retryAttempt, steering/follow-up queues, currentModel, thinkingLevel, toolOutputExpanded, hideThinkingBlock, hiddenThinkingLabel).
- [x] **Footer**: Dynamic hiển thị cwd, session name, model, thinking level, token stats (in/out/cache/cost), auto-compact hint.
- [x] **ModelSelectorModal**: Load tất cả models từ modelRegistry, search, chọn và set model.
- [x] **SettingsSelectorModal**: Hỗ trợ nhiều setting: theme, default thinking, transport, auto-compaction, hide thinking, show images, image width, skill commands, steering/follow-up mode, double-escape, quiet startup.
- [x] **Debug command** (`/debug`): Ghi log debug (session stats, message history).
- [x] **Easter eggs**: `/arminsayshi`, `/dementedelves`.
- [x] **Build successful**: TypeScript + esbuild clean.

### D. Components (molecules)
- [x] `UserMessage` component.
- [x] `AssistantMessage` component (placeholder).

---

## 📦 Dependencies & Imports

Cần đảm bảo imports đầy đủ từ:
- `@mariozechner/pi-tui`: Container, TUI, Text, Box, Markdown, Loader, Spacer, etc.
- `@mariozechner/pi-ai`: types cho messages
- `../../core/...`: AgentSession, AgentSessionRuntime, ExtensionUIContext, etc.
- `../../config.js`: APP_NAME, VERSION, getChangelogPath, etc.
- `../../utils/...`: clipboard, image, shell, tools-manager
- `./theme/theme.js`: theme helpers
- `./components/*`: tất cả components đã có và mới
- `./modals/*`: tất cả modals
- `../keybindings`: KeybindingsManager, AppKeybinding types
- `../settings`: SettingsManager

---

## 🔄 Workflow

1. **Phase 1**: hoàn thiện InkApp state, layout, event handling
2. **Phase 2**: implement message components (Assistant, Tool, Bash, etc.)
3. **Phase 3**: implement selectors & dialogs còn thiếu
4. **Phase 4**: implement extension system
5. **Phase 5**: implement command handlers & utilities
6. **Phase 6**: test, polish, performance

---

**Lưu ý**: Không copy code từ reference. Đọc, hiểu kiến trúc, sau đó implement theo cách phù hợp với React/Ink pattern hiện tại. Sử dụng types từ AgentSessionRuntimeInterface và các interface phù hợp.
