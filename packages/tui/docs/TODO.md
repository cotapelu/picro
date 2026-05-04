# InteractiveMode Implementation Plan

## Overview
Build a full-featured `InteractiveMode` class in `packages/tui/src/interactive/interactive-mode.ts` that provides an AI chat interface using the existing `TerminalUI` engine and component library.

## Reference Implementation
- **File**: `packages/tui/llm-context/tui-agent/modes/interactive/interactive-mode.ts` (5462 lines)
- This is the **complete reference** with all features.

## Existing `tui` Package Assets
The `tui` package already includes a rich set of components:

### Atoms (UI primitives)
- `UserMessage`, `AssistantMessage`, `ToolMessage`
- `ToolExecutionMessage`, `BashExecutionMessage`
- `BranchSummaryMessage`, `CompactionSummaryMessage`
- `CustomMessage`, `EarendilAnnouncement`, `Daxnuts`, `Armin`
- `Text`, `Spacer`, `DynamicBorder`, `TruncatedText`
- `Markdown` (with syntax highlighting)
- `Theme` management (`themes.ts`, `theme/`)
- `Keybindings` (`keybindings.ts`)

### Molecules (Composite)
- `SettingsSelector`, `ModelSelector`, `ScopedModelsSelector`
- `SessionSelector`, `TreeSelector`, `UserMessageSelector`
- `ExtensionSelector`, `ExtensionInput`, `ExtensionEditor`
- `LoginDialog`, `ConfigSelector`
- `CountdownTimer`
- `ShowImagesSelector`

### Organisms (Complex)
- `ExtensionEditor` (full multi-line editor with Ctrl+G)

### Core Engine (`tui.ts`)
- `TerminalUI` – rendering, panels, focus, key/mouse handling, scrolling, themes, debug tools
- `ElementContainer` – base container class
- `Panel` system – modal overlays, z-index, anchor positioning

---

## Implementation Phases

### Phase 1: Layout Architecture
- [ ] Make `InteractiveMode` extend `ElementContainer` (implements `UIElement`)
- [ ] Define layout containers:
  - `headerContainer` (optional, 1 line)
  - `chatContainer` (scrollable messages)
  - `pendingMessagesContainer` (steering/follow-up queue)
  - `statusContainer` (status line, can be multi-line?)
  - `widgetContainerAbove` (max 3 lines)
  - `widgetContainerBelow` (max 3 lines)
  - `editorContainer` (holds current editor component)
  - `footer` (default footer with model/tokens)
- [ ] Implement `draw(context)`:
  - Calculate fixed heights (header, pending, status, widgets, editor, widgets, footer)
  - Allocate remaining height to `chatContainer` (scrollable)
  - Render each container in order
  - Handle viewport scrolling for chat
- [ ] Implement `handleKey()` to forward keys to focused element or handle globally

### Phase 2: Core Messaging
- [ ] `addUserMessage(text)` → create `UserMessage` component, add to `chatContainer`
- [ ] `addAssistantMessage(text)` → create `AssistantMessage` component, add to `chatContainer`
- [ ] `addToolMessage(name, output, exitCode?)` → create `ToolMessage` component
- [ ] `addBashMessage(command, output?, exitCode?, excludeFromContext?)` → `BashExecutionMessage`
- [ ] `showStatus(message)` → update `statusContainer`
- [ ] `setRightItems(items)` → update footer.rightItems
- [ ] `setWidget(key, content)` → set widget in above/below containers (respect MAX_WIDGET_LINES=10)

### Phase 3: Agent Integration
- [ ] Add `runtimeHost?: any` field (avoid circular import)
- [ ] Add `session`, `agent`, `sessionManager`, `settingsManager`, `extensionRunner`, `resourceLoader`, `modelRegistry` getters
- [ ] `subscribeToAgent()` method:
  - `this.session.subscribe((event) => this.handleEvent(event))`
  - Handle events: `agent:start`, `agent:end`, `turn:start`, `message:start`, `message:update`, `message:end`, `tool:call:start/end`, `compaction:start/end`, `auto_retry:start/end`, etc.
- [ ] `init()` – setup key handlers, editor submit, extensions, initial messages, version checks

### Phase 4: Streaming & Tool Execution
- [ ] `streamingComponent` field for assistant delta updates
- [ ] `pendingTools = Map<toolCallId, ToolExecutionMessage>`
- [ ] `toolOutputExpanded` boolean
- [ ] On `message:start` (assistant) → create `AssistantMessageComponent` (needs custom class that supports streaming delta, thinking blocks, markdown)
  - **Note**: `AssistantMessage` atom may not support streaming; may need to create `AssistantMessageComponent` molecule that updates content incrementally
- [ ] On `message:update` → update streaming component content, add new `ToolExecutionMessage` for each tool call
- [ ] On `message:end` → finalize streaming, show error if aborted/error
- [ ] `setToolsExpanded(expanded)` → update all expandable components
- [ ] `toggleToolOutputExpansion()` – toggle and update UI

### Phase 5: Selectors & Dialogs
Implement modal selectors using `tui.showPanel()`:
- [ ] `showSettingsSelector()` – `SettingsSelector` component
- [ ] `showModelSelector(initialSearch?)` – `ModelSelector`
- [ ] `showModelsSelector()` – `ScopedModelsSelector`
- [ ] `showSessionSelector()` – `SessionSelector`
- [ ] `showTreeSelector(initialSelectedId?)` – `TreeSelector` with summarization prompt
- [ ] `showUserMessageSelector()` – `UserMessageSelector` (fork)
- [ ] `showExtensionSelector(title, options)` – `ExtensionSelector`
- [ ] `showExtensionInput(title, placeholder)` – `ExtensionInput`
- [ ] `showExtensionEditor(title, prefill?)` – `ExtensionEditor` (multi-line)
- [ ] `showExtensionCustom(factory, options)` – overlay/embedded custom component
- [ ] `showLoginAuthTypeSelector()`, `showLoginProviderSelector()`, `showLoginDialog()`, `showBedrockSetupDialog()`, `showApiKeyLoginDialog()`
- [ ] `showExtensionConfirm(title, message)` – reuse `ExtensionSelector` with Yes/No

### Phase 6: Extension System
- [ ] `createExtensionUIContext()` – returns `ExtensionUIContext` interface
  - Implement: `select`, `confirm`, `input`, `notify`, `onTerminalInput`, `setStatus`, `setWorkingMessage`, `setWorkingVisible`, `setWorkingIndicator`, `setHiddenThinkingLabel`, `setWidget`, `setFooter`, `setHeader`, `setTitle`, `custom`, `pasteToEditor`, `setEditorText`, `getEditorText`, `editor`, `addAutocompleteProvider`, `setEditorComponent`, `theme` getters, `setTheme`, `getToolsExpanded`, `setToolsExpanded`
- [ ] `bindExtensions()` – called from `init()` or `rebindCurrentSession()`
  - Setup extension runner with `uiContext`
  - Setup extension shortcuts (`setupExtensionShortcuts()`)
  - Load extension widgets
- [ ] `resetExtensionUI()` – cleanup on session invalidate
- [ ] `extensionWidgetsAbove` / `extensionWidgetsBelow` maps
- [ ] `setExtensionWidget(key, content, options)` – create component from string[] or factory
- [ ] `setExtensionFooter(factory)` / `setExtensionHeader(factory)` – replace default footer/header
- [ ] `customEditorComponent` support

### Phase 7: Commands & Keybindings
- [ ] Setup key handlers in `setupKeyHandlers()`:
  - `app.interrupt` – `handleCtrlC()`
  - `app.clear` – `clearEditor()` or double-Ctrl+C to quit
  - `app.exit` – `handleCtrlD()` (when editor empty)
  - `app.suspend` – `handleCtrlZ()`
  - `app.thinking.cycle` – `cycleThinkingLevel()`
  - `app.model.cycleForward/Backward` – `cycleModel()`
  - `app.model.select` – `showModelSelector()`
  - `app.tools.expand` – `toggleToolOutputExpansion()`
  - `app.thinking.toggle` – `toggleThinkingBlockVisibility()`
  - `app.editor.external` – `openExternalEditor()`
  - `app.message.followUp` – `handleFollowUp()`
  - `app.message.dequeue` – `handleDequeue()`
  - `app.session.new` – `handleClearCommand()`
  - `app.session.tree` – `showTreeSelector()`
  - `app.session.fork` – `showUserMessageSelector()`
  - `app.session.resume` – `showSessionSelector()`
- [ ] `setupEditorSubmitHandler()` – `defaultEditor.onSubmit` handler that processes:
  - Slash commands (`/settings`, `/model`, `/export`, `/import`, `/share`, `/copy`, `/name`, `/session`, `/changelog`, `/hotkeys`, `/fork`, `/clone`, `/tree`, `/login`, `/logout`, `/new`, `/compact`, `/reload`, `/debug`, `/scoped-models`, `/resume`, `/quit`)
  - Bash commands (`!cmd`, `!!cmd`)
  - Queue messages during compaction/streaming

### Phase 8: Utilities & Helpers
- [ ] `showError(msg)`, `showWarning(msg)`, `showStatus(msg)` (with duplicate status coalescing)
- [ ] `updateEditorBorderColor()` – based on bash mode / thinking level
- [ ] `cycleThinkingLevel()` – call `session.cycleThinkingLevel()`
- [ ] `maybeWarnAboutAnthropicSubscriptionAuth(model)`
- [ ] `checkDaxnutsEasterEgg(model)`
- [ ] `handleBashCommand(command, excludeFromContext)` – call `session.executeBash()` with extension interception
- [ ] `handleCompactCommand(customInstructions)`
- [ ] `handleReloadCommand()` – reset extension UI, reload resources
- [ ] `handleExportCommand()`, `handleImportCommand()`, `handleShareCommand()`, `handleCopyCommand()`
- [ ] `handleNameCommand()`, `handleSessionCommand()`, `handleChangelogCommand()`, `handleHotkeysCommand()`
- [ ] `handleDebugCommand()` – write debug log
- [ ] `openExternalEditor()` – spawn external editor
- [ ] `handleClipboardImagePaste()` – read clipboard image, insert file path
- [ ] `updateTerminalTitle()`

### Phase 9: Compaction & Queue Management
- [ ] `compactionQueuedMessages` array
- [ ] `queueCompactionMessage(text, mode)`
- [ ] `getAllQueuedMessages()` – combine session queue + compaction queue
- [ ] `clearAllQueues()` – clear both and return messages
- [ ] `updatePendingMessagesDisplay()` – render pending messages in `pendingMessagesContainer`
- [ ] `restoreQueuedMessagesToEditor(options)` – move queued text to editor
- [ ] `flushCompactionQueue()` – send queued messages after compaction
- [ ] `autoCompactionLoader`, `autoCompactionEscapeHandler`
- [ ] Handle `compaction:start/end` events

### Phase 10: Auto-Retry
- [ ] `retryLoader`, `retryCountdown`, `retryEscapeHandler`
- [ ] Handle `auto_retry:start/end` events
- [ ] Show countdown timer with abort hint

### Phase 11: Session Management
- [ ] `fork(entryId)` – call `runtimeHost.fork()`
- [ ] `newSession()` – call `runtimeHost.newSession()`
- [ ] `resumeSession(path)` – call `runtimeHost.switchSession()`
- [ ] `handleResumeSession(path, options)` – with MissingSessionCwdError handling
- [ ] Session selectors already covered in Phase 5

### Phase 12: Model Management
- [ ] `findExactModelMatch(searchTerm)` – use `session.modelRegistry`
- [ ] `getModelCandidates()` – scoped or all
- [ ] `updateAvailableProviderCount()` – for footer
- [ ] `maybeWarnAboutAnthropicSubscriptionAuth(model)`
- [ ] `checkDaxnutsEasterEgg(model)`

### Phase 13: Footer & Status
- [ ] `Footer` component integration
- [ ] `FooterDataProvider` (exists? need check)
- [ ] Auto-compaction badge
- [ ] Right items: model, thinking level, tokens, provider count
- [ ] `footer.invalidate()` method? (Footer may have `clearCache`)

### Phase 14: Startup & Shutdown
- [ ] `init()` – setup containers, key handlers, extensions bind, show loaded resources, initial messages
- [ ] `run()` – main loop: `while (running) { await getUserInput(); session.prompt(); }`
- [ ] `stop()` – cleanup
- [ ] Signal handlers (`SIGTERM`, `SIGHUP`)
- [ ] `checkShutdownRequested()`
- [ ] `registerSignalHandlers()`, `unregisterSignalHandlers()`

### Phase 15: Version & Package Checks
- [ ] `checkForNewVersion()` – fetch npm registry
- [ ] `checkForPackageUpdates()` – `DefaultPackageManager`
- [ ] `checkTmuxKeyboardSetup()` – tmux extended-keys check
- [ ] `showNewVersionNotification()`, `showPackageUpdateNotification()`

### Phase 16: Resource Loading Display
- [ ] `showLoadedResources()` – display skills, prompts, extensions, themes, diagnostics
- [ ] `getCompactExtensionLabels()`, `buildScopeGroups()`, `formatDiagnostics()`
- [ ] Changelog display on startup

### Phase 17: Output Guards (Optional)
- [ ] `takeOverStdout()`, `restoreStdout()` – for rich output from tools
- [ ] `validateOutput()` – binary/size checks
- [ ] `sanitizeOutput()` – remove ANSI, truncate

### Phase 18: Performance Optimizations
- [ ] Incremental rendering already handled by `TerminalUI`
- [ ] Cache rendered components (each `UIElement.clearCache()` pattern)
- [ ] Throttle renders via `TerminalUI.setRenderInterval()`
- [ ] Only update changed lines (TerminalUI does this)

---

## Missing Components to Create?

Check if these exist in `tui/src/`; if not, they must be created:

- [ ] `AssistantMessageComponent` (with streaming, thinking blocks, markdown) – may need to extend `AssistantMessage` atom
- [ ] `ToolExecutionComponent` – exists as `ToolExecutionMessage`? Check API.
- [ ] `BashExecutionComponent` – exists as `BashExecutionMessage`? Check.
- [ ] `BranchSummaryMessageComponent` – exists? Check.
- [ ] `CompactionSummaryMessageComponent` – exists? Check.
- [ ] `SkillInvocationMessageComponent` – exists? Check.
- [ ] `CustomMessageComponent` – exists? Check.
- [ ] `EarendilAnnouncementComponent` – exists as `EarendilAnnouncement`? Check.
- [ ] `DaxnutsComponent`, `ArminComponent` – exists? Check.
- [ ] `Loader` – exists as `ProgressBar`? Check.
- [ ] `CountdownTimer` – molecule exists? Check.
- [ ] `Footer` – exists? Check.
- [ ] `FooterDataProvider` – exists? Need to verify.
- [ ] `SettingsSelector` – exists? Check.
- [ ] `ModelSelector` – exists? Check.
- [ ] `ScopedModelsSelector` – exists? Check.
- [ ] `SessionSelector` – exists? Check.
- [ ] `TreeSelector` – exists? Check.
- [ ] `UserMessageSelector` – exists? Check.
- [ ] `ExtensionSelector`, `ExtensionInput`, `ExtensionEditor` – exist? Check.
- [ ] `LoginDialog` – exists? Check.
- [ ] `ConfigSelector` – exists? Check.
- [ ] `KeybindingsManager` – exists? Check `keybindings.ts`.
- [ ] `Theme` utilities – `getMarkdownTheme()`, `setTheme()`, `initTheme()`, `onThemeChange()` – need to verify location.

---

## Integration Points with Agent Package

`InteractiveMode` will consume:

- `AgentSessionRuntime` (passed in options)
  - `runtime.session`
  - `runtime.switchSession(path, opts)`
  - `runtime.newSession(opts)`
  - `runtime.fork(entryId, opts)`
  - `runtime.importFromJsonl(path, cwd?)`
  - `runtime.setBeforeSessionInvalidate(handler)`
  - `runtime.setRebindSession(handler)`

- `AgentSession` (`runtime.session`)
  - `session.prompt(text, options)`
  - `session.subscribe(event => ...)`
  - `session.model`, `session.thinkingLevel`, `session.scopedModels`
  - `session.autoCompactionEnabled`, `session.steeringMode`, `session.followUpMode`
  - `session.getToolDefinition(name)`
  - `session.getUserMessagesForForking()`
  - `session.getSessionStats()`, `session.getLastAssistantText()`
  - `session.messages` (for rebuilding chat)
  - `session.isStreaming`, `session.isCompacting`, `session.isBashRunning`
  - `session.setModel(model)`, `session.cycleModel(direction)`, `session.setScopedModels(...)`
  - `session.setAutoCompactionEnabled(enabled)`
  - `session.setSteeringMode(mode)`, `session.setFollowUpMode(mode)`
  - `session.setThinkingLevel(level)`, `session.cycleThinkingLevel()`
  - `session.setSessionName(name)`
  - `session.compact(customInstructions?)`
  - `session.executeBash(command, onChunk, options)`
  - `session.recordBashResult(...)`
  - `session.abort()`, `session.abortBash()`, `session.abortBranchSummary()`, `session.abortCompaction()`, `session.abortRetry()`
  - `session.retryAttempt`
  - `session.extensionRunner` – `getRegisteredCommands()`, `getCommand(name)`, `emitUserBash()`, `getMessageRenderer()`, `getShortcuts()`, `getCommandDiagnostics()`, `getShortcutDiagnostics()`
  - `session.resourceLoader` – `getSkills()`, `getPrompts()`, `getThemes()`, `getExtensions()`, `getAgentsFiles()`, `getAvailableThemesWithPaths()`
  - `session.modelRegistry` – `getAvailable()`, `getApiKeyForProvider(provider)`, `getProviderAuthStatus(provider)`, `authStorage` (list, get, set, login, logout), `getAll()`, `refresh()`, `getError()`
  - `session.settingsManager` – various getters/setters (see reference)

---

## Testing Checklist
- [ ] Basic chat: user → assistant → tool → result flow
- [ ] Streaming assistant with delta updates
- [ ] Tool execution panel with real-time output
- [ ] Bash commands (with and without context)
- [ ] All slash commands
- [ ] Session management (new, fork, resume, tree navigation with summary)
- [ ] Model switching (single, scoped models selector)
- [ ] Settings selector (all toggles work)
- [ ] Extensions: load, enable/disable, widgets, shortcuts, custom editor
- [ ] Compaction (manual, auto, queued messages)
- [ ] Auto-retry on transient errors
- [ ] Theme switching
- [ ] Keybindings customization
- [ ] External editor
- [ ] Clipboard image paste
- [ ] Header/footer customization
- [ ] Dialogs (select, confirm, input, editor)
- [ ] Notifications (toast)
- [ ] Error/warning/status display
- [ ] Shutdown/suspend signals
- [ ] Version & package update checks

---

## Dependencies to Import (from `@picro/tui` or relative)
```typescript
import { TerminalUI } from './tui.js';
import { ElementContainer } from './atoms/base.js';
import { Input } from './molecules/input.js';
import { Footer } from './atoms/footer.js';
import { UserMessage } from './atoms/user-message.js';
import { AssistantMessage } from './atoms/assistant-message.js';
import { ToolMessage } from './atoms/tool-message.js';
import { ToolExecutionMessage } from './atoms/tool-execution.js';
import { BashExecutionMessage } from './atoms/bash-execution-message.js';
import { BranchSummaryMessage } from './atoms/branch-summary-message.js';
import { CompactionSummaryMessage } from './atoms/compaction-summary-message.js';
import { CustomMessage } from './atoms/custom-message.js';
import { EarendilAnnouncement } from './atoms/earendil-announcement.js';
import { Daxnuts } from './atoms/daxnuts.js';
import { Armin } from './atoms/daxnuts.js'; // or separate?
import { Markdown } from './atoms/markdown.js';
import { Spacer, Text, TruncatedText, DynamicBorder } from './atoms/...';
import { Loader } from './atoms/progress-bar.js';
import { SettingsSelector } from './molecules/settings-selector.js';
import { ModelSelector } from './molecules/model-selector.js';
import { ScopedModelsSelector } from './molecules/scoped-models-selector.js';
import { SessionSelector } from './molecules/session-selector-search.js';
import { TreeSelector } from './molecules/tree-selector.js';
import { UserMessageSelector } from './molecules/user-message-selector.js';
import { ExtensionSelector } from './molecules/extension-selector.js';
import { ExtensionInput } from './molecules/extension-input.js';
import { ExtensionEditor } from './organisms/extension-editor.js';
import { LoginDialog } from './organisms/login-dialog.js';
import { ConfigSelector } from './molecules/config-selector.js';
import { CountdownTimer } from './molecules/countdown-timer.js';
import type { ExtensionUIContext, ExtensionWidgetOptions, ExtensionUIDialogOptions } from './extensions/extension-ui-context.js';
import type { AutocompleteProvider } from './atoms/autocomplete.js';
// Plus theme utilities from theme module
```

---

## Notes
- Avoid copying logic verbatim; adapt to existing `tui` architecture.
- Use `TerminalUI`'s panel system for dialogs/selectors instead of embedding in main layout.
- Rely on `TerminalUI`'s incremental rendering; just call `requestRender()` when state changes.
- Use `ElementContainer` for grouping child components.
- All UI state changes should trigger `tui.requestRender()`.
- Focus management: use `tui.setFocus(element)`.
- For modal dialogs, use `tui.showPanel(component, options)` and return Promise.
- Keep `InteractiveMode` as a self-contained component that can be appended to `TerminalUI`.

---

## Order of Implementation
1. **Minimal working chat**: Layout + `addUserMessage` + `addAssistantMessage` + `onSubmit` → `runtimeHost.session.prompt()`
2. **Agent events**: Subscribe and render streaming assistant + tool messages
3. **Commands & keybindings**: slash commands, bash, Ctrl+C, etc.
4. **Selectors**: settings, model, session, tree, extensions
5. **Extension system**: UIContext, widgets, shortcuts, custom editor
6. **Compaction & retry**
7. **Polishing**: themes, markdown, images, external editor, clipboard, version checks, resource loading display

---

## Estimated Effort
- Phase 1–3: 4–6 hours (core chat + agent integration)
- Phase 4–5: 3–4 hours (streaming/tools + selectors)
- Phase 6: 2–3 hours (extensions)
- Phase 7: 2–3 hours (commands)
- Phase 8–10: 2–3 hours (utils, compaction, retry)
- Phase 11–14: 2–3 hours (session/model/footer/startup)
- Testing & polish: 2–3 hours

**Total**: ~20–30 hours of focused coding.
