# InteractiveMode Implementation Todo List

## File: `packages/tui/src/interactive/interactive-mode.ts`

**Status**: In Progress – Core layout + basic agent integration done (~2000 lines). Need ~3000 more lines from reference.

---

## ✅ Completed (Phase 1-3)

- [x] Basic layout: header, chat, pending, status, widgetAbove, editor, widgetBelow, footer
- [x] `ElementContainer` children management
- [x] `draw()` method with height calculation
- [x] `handleKey()` stub + key handler registration
- [x] Constructor: creates containers, default editor, footer, extension context
- [x] `init()`: signals, key handlers, editor submit, extensions, resources
- [x] `run()` main loop
- [x] `getUserInput()` promise
- [x] `stop()` cleanup
- [x] Agent subscription: `subscribeToAgent()`, `handleEvent()` with basic events
- [x] Compaction: `handleCompactionStart/End`, `compactionQueuedMessages`, `flushCompactionQueue`
- [x] Auto-retry: `handleAutoRetryStart/End`
- [x] Basic message adding: `addUserMessage()`, `addAssistantMessage()`, `addToolMessage()`
- [x] `setStatus()`, `setRightItems()`
- [x] `setWidget()`, `setHeader()`, `setCustomFooter()`
- [x] `showError()`, `showWarning()`
- [x] `rebuildChatFromMessages()`
- [x] `handleSubmit()` with basic slash commands (`/settings`, `/model`, `/export`, `/import`, `/new`, `/compact`, `/reload`, `/resume`, `/tree`, `/fork`, `/changelog`, `/hotkeys`, `/quit`, `/login`, `/logout`)
- [x] Bash command stub: `handleBashCommand()`
- [x] Working loader stub
- [x] Signal handlers: `registerSignalHandlers()`, `unregisterSignalHandlers()`
- [x] Shutdown: `handleCtrlC()`, `handleCtrlD()`, `handleCtrlZ()`, `shutdown()`

---

## 🚧 In Progress / Partial

- [ ] **Agent event handling** – need full delta streaming, tool execution lifecycle
  - [x] `agent:start`, `agent:end`, `queue_update`, `session_info_changed`
  - [x] `message:start`, `message:update`, `message:end` (basic)
  - [x] `tool:call:start`, `tool:call:update`, `tool:call:end` (basic)
  - [ ] Detailed delta handling for assistant streaming (content blocks, thinking)
  - [ ] Tool execution component creation with `getRegisteredToolDefinition()`
  - [ ] Tool result matching to pending tools
- [ ] **Selectors & Dialogs** – need to implement using real components
  - [x] `showSettingsSelector()` – stub
  - [x] `showModelSelector()` – stub
  - [x] `showSessionSelector()` – stub
  - [x] `showTreeSelector()` – stub
  - [x] `showUserMessageSelector()` – stub
  - [ ] Implement `SettingsSelector` dialog (with all options)
  - [ ] Implement `ModelSelector` (search, pick model)
  - [ ] Implement `ScopedModelsSelector` (for `/scoped-models`)
  - [ ] Implement `SessionSelector` (list, search, rename, delete)
  - [ ] Implement `TreeSelector` (entries, summarization prompt)
  - [ ] Implement `UserMessageSelector` (fork)
- [ ] **Extension System**
  - [x] `createExtensionUIContext()` stub
  - [ ] Implement full `ExtensionUIContext` methods:
    - [x] `select`, `confirm`, `input`, `notify`
    - [x] `setStatus`, `setWorkingMessage`, `setWorkingVisible`, `setWorkingIndicator`, `setHiddenThinkingLabel`
    - [x] `setWidget`, `setFooter`, `setHeader`, `setTitle`, `custom`
    - [x] `pasteToEditor`, `setEditorText`, `getEditorText`, `editor`
    - [x] `addAutocompleteProvider`, `setEditorComponent`
    - [x] `theme` getters, `setTheme`, `getAllThemes`, `getTheme`, `getToolsExpanded`, `setToolsExpanded`
  - [ ] `bindCurrentSessionExtensions()` – setup extension runner with uiContext
  - [ ] `setupExtensionShortcuts()` – register extension shortcuts on editor
  - [ ] `resetExtensionUI()` – cleanup on invalidate
  - [ ] `setExtensionWidget()` – handle string[] or factory, dispose old
  - [ ] `setExtensionFooter()`, `setExtensionHeader()` – replace default
  - [ ] `showExtensionCustom()` – overlay or embedded
  - [ ] `showExtensionError()` – display error in chat
  - [ ] `showExtensionNotify()` – toast
  - [ ] `addExtensionTerminalInputListener()`, `clearExtensionTerminalInputListeners()`
  - [ ] `setCustomEditorComponent()` – swap editor (e.g., for extension)
- [ ] **Tool Execution UI**
  - [ ] Use `ToolExecutionMessage` component properly (not just ToolMessage)
  - [ ] Track `pendingTools` Map correctly (toolCallId -> component)
  - [ ] Update component on `tool:call:update` (partial result)
  - [ ] Expand/collapse all tool outputs (`setToolsExpanded`)
  - [ ] `getRegisteredToolDefinition()` to customize rendering
- [ ] **Streaming Assistant** – need component that can update content incrementally
  - [ ] `AssistantMessage` atom may not support delta updates – need to check or create `AssistantMessageComponent` molecule
  - [ ] Handle `message:start` with initial delta
  - [ ] Handle `message:delta` to append content (text blocks, tool calls)
  - [ ] Handle thinking blocks visibility (`hideThinkingBlock`)
  - [ ] Handle stop reasons (aborted, error)
- [ ] **Commands (remaining)**:
  - [ ] `/scoped-models` – show `ScopedModelsSelector`
  - [ ] `/clone` – `handleCloneCommand()` (fork at leaf)
  - [ ] `/debug` – `handleDebugCommand()` (write debug log, show agent messages)
  - [ ] `/arminsayshi` – easter egg (show `Armin` component)
  - [ ] `/dementedelves` – easter egg (show `EarendilAnnouncement`)
  - [ ] (maybe `/daxnuts` if needed)
- [ ] **Utilities**:
  - [ ] `updateTerminalTitle()` – with session name and cwd
  - [ ] `cycleThinkingLevel()` – call `session.cycleThinkingLevel()`, update border/footer
  - [ ] `cycleModel()` – forward/backward, show status
  - [ ] `toggleToolOutputExpansion()`
  - [ ] `toggleThinkingBlockVisibility()` – rebuild chat
  - [ ] `openExternalEditor()` – spawn external editor with temp file
  - [ ] `handleClipboardImagePaste()` – read image, insert path
  - [ ] `getAppKeyDisplay()`, `getEditorKeyDisplay()` – for hotkeys command
  - [ ] `handleHotkeysCommand()` – show table of keybindings (use `Markdown`)
  - [ ] `handleSessionCommand()` – show session stats
  - [ ] `handleNameCommand()` – set/get session name
  - [ ] `handleCopyCommand()` – copy last assistant text
  - [ ] `handleShareCommand()` – export to HTML, create gist with gh CLI
  - [ ] `handleExportCommand()` – HTML/JSONL
  - [ ] `handleImportCommand()` – with confirmation, cwd handling
- [ ] **Model Management**:
  - [ ] `findExactModelMatch(searchTerm)` – use `resolveModelReferenceMatch` (if available) or fuzzy
  - [ ] `getModelCandidates()` – returns scoped or all
  - [ ] `updateAvailableProviderCount()` – for footer right items
  - [ ] `maybeWarnAboutAnthropicSubscriptionAuth(model)`
  - [ ] `checkDaxnutsEasterEgg(model)`
- [ ] **Session Management**:
  - [ ] `fork()` – call `runtimeHost.fork()`, handle result
  - [ ] `newSession()` – call `runtimeHost.newSession()`
  - [ ] `handleResumeSession(path, options)` – with MissingSessionCwdError handling
  - [ ] `switchSession()` via runtimeHost – already used
- [ ] **Footer & Status**:
  - [ ] `Footer` needs `setLeftItems`, `setRightItems`, `invalidate()`, maybe `clearCache?`
  - [ ] `FooterDataProvider` – exists? Need to check. If not, create simple provider or inline.
  - [ ] Auto-compaction badge? Maybe footer shows `session.autoCompactionEnabled`
- [ ] **Resources Display** (`showLoadedResources`):
  - [ ] Show context files (`session.resourceLoader.getAgentsFiles()`)
  - [ ] Show skills with scope groups (`buildScopeGroups`, `formatScopeGroups`)
  - [ ] Show prompt templates
  - [ ] Show extensions (with package/non-package labels)
  - [ ] Show themes (custom)
  - [ ] Show diagnostics for skills, prompts, extensions, themes
  - [ ] Changelog on startup (if not resumed)
- [ ] **Extension Runner Hooks**:
  - [ ] `session.extensionRunner.getRegisteredCommands()` – for autocomplete
  - [ ] `session.extensionRunner.getCommand(name)` – to check extension commands
  - [ ] `session.extensionRunner.emitUserBash()` – for bash interception
  - [ ] `session.extensionRunner.getMessageRenderer(customType)` – for custom messages
  - [ ] `session.extensionRunner.getShortcuts()` – register on editor
  - [ ] `session.extensionRunner.getCommandDiagnostics()`, `getShortcutDiagnostics()`
- [ ] **Autocomplete**
  - [ ] `setupAutocompleteProvider()` – create base with slash commands, templates, extension commands, skill commands
  - [ ] `getAutocompleteSourceTag()`, `prefixAutocompleteDescription()`
  - [ ] `fdPath` from ensureTool – need to integrate tool download (maybe agent handles)
- [ ] **Theme & Markdown**
  - [ ] `getMarkdownThemeWithSettings()` – uses `settingsManager.getCodeBlockIndent()`
  - [ ] Pass markdown theme to `Markdown` components
- [ ] **Output Guards** (optional):
  - [ ] `takeOverStdout()`, `restoreStdout()` for rich tool output
  - [ ] `validateOutput()` binary/size checks before displaying
  - [ ] `sanitizeOutput()` strip ANSI, truncate
- [ ] **RPC Mode / Print Mode** – likely not needed for this package
- [ ] **Performance**
  - [ ] Incremental rendering already handled by TerminalUI
  - [ ] Cache rendered components? Each UIElement can cache its own lines.
- [ ] **Version & Package Checks**:
  - [ ] `checkForNewVersion()` – fetch npm, compare
  - [ ] `checkForPackageUpdates()` – use `DefaultPackageManager` (from agent? need import)
  - [ ] `checkTmuxKeyboardSetup()` – tmux extended-keys check
  - [ ] `showNewVersionNotification()`, `showPackageUpdateNotification()`
- [ ] **Misc**:
  - [ ] `applyRuntimeSettings()` – update UI based on settings changes
  - [ ] `bindCurrentSessionExtensions()` – separate from init, called on rebind
  - [ ] `rebindCurrentSession()` – call applyRuntimeSettings + bindExtensions + subscribe + update editor border + title
  - [ ] `handleFatalRuntimeError()` – show error, stop, exit(1)
  - [ ] `renderCurrentSessionState()` – clear containers, rebuild chat
  - [ ] `renderInitialMessages()` – build context and render
  - [ ] `flushPendingBashComponents()` – move pending bash components to chat

---

## ❌ Not Needed / Already in TerminalUI

- [~] `showPanel()` – use `tui.showPanel()` directly for dialogs
- [~] `setFocus()` – use `tui.setFocus(element)`
- [~] `requestRender()` – use `tui.requestRender()`
- [~] Incremental rendering – TerminalUI handles automatically
- [~] Panel z-index, anchor, positioning – TerminalUI handles
- [~] Key chords, key repeat – TerminalUI handles
- [~] Mouse handling – TerminalUI handles
- [~] Scrolling – TerminalUI handles
- [~] Theme switching – components use theme from context; we can set via component's theme property or global theme (if TerminalUI supports)

---

## 🔧 Component API Checks (Need to verify exist and signatures)

- [ ] `Footer` – does it have `setLeftItems(items)`, `setRightItems(items)`, `invalidate()`, `dispose()`?
- [ ] `Input` – does it have `setValue(text)`, `getText()`, `addToHistory?`, `onSubmit`, `onCancel`, `onEscape`?
- [ ] `AssistantMessage` – does it support updating content after creation? Probably not – might need to create custom component that can update.
- [ ] `ToolExecutionMessage` – does it have `updateArgs(args)`, `updateResult(result, isError)`, `setExpanded(expanded)`, `markExecutionStarted()`?
- [ ] `BashExecutionMessage` – `appendOutput(chunk)`, `setComplete(exitCode, cancelled, truncation?, fullOutputPath?)`
- [ ] `BranchSummaryMessage`, `CompactionSummaryMessage`, `CustomMessage`, `EarendilAnnouncement`, `Daxnuts`, `Armin` – all should be UIElements, may need `setExpanded()`.
- [ ] `Markdown` – constructor likely `new Markdown(content, paddingX?, paddingY?, theme?)`
- [ ] `Loader` (or `ProgressBar`) – constructor: `new Loader(tui, spinnerFn, textFn, initialText)`, methods: `setMessage()`, `stop()`, `dispose()`.
- [ ] `CountdownTimer` – constructor: `new CountdownTimer(timeoutMs, onTick, onComplete, onRender?)`, methods: `dispose()`.
- [ ] `SettingsSelector` – needs to be a component that takes initial settings, onChange callbacks, returns on close.
- [ ] `ModelSelector` – takes tui, session.model, settingsManager, modelRegistry, scopedModels, onSelect, onCancel, initialSearch?
- [ ] `SessionSelector` – complex – list sessions, search, resume, rename, delete.
- [ ] `TreeSelector` – entries, realLeafId, terminalRows, onSelect, onLabelChange, initialSelectedId, initialFilterMode.
- [ ] `UserMessageSelector` – messages (entryId, text), onSelect, onCancel, initialSelectedId.
- [ ] `ExtensionSelector`, `ExtensionInput` – simple; `ExtensionEditor` – multi-line with Ctrl+G.
- [ ] `LoginDialog` – tui, providerId, onComplete, providerName, title; methods: `showAuth()`, `showPrompt()`, `showProgress()`, `showInfo()`, `showManualInput()`, signal.
- [ ] `ConfigSelector` – maybe for extension config? Not critical.

---

## 📦 Missing Imports / Dependencies

- [ ] `theme` module – need to import: `getMarkdownTheme`, `setTheme`, `initTheme`, `onThemeChange`, `getAvailableThemes`, `getThemeByName`
- [ ] `ensureTool` for fd/rg – may be handled by agent, not TUI.
- [ ] `createAgentToolBridge` – perhaps not needed; we use ToolExecutionMessage directly.
- [ ] `copyToClipboard` – agent utils? We can implement directly.
- [ ] `readClipboardImage`, `extensionForImageMimeType` – need to import from somewhere.
- [ ] `parseGitUrl` – for extension path formatting.
- [ ] `killTrackedDetachedChildren`, `spawn`, `spawnSync` – for external editor, share.
- [ ] `getChangelogPath`, `parseChangelog`, `getNewEntries` – for changelog.
- [ ] `getAgentDir`, `getAuthPath`, `getDocsPath`, `getShareViewerUrl`, `APP_NAME`, `VERSION` – constants.
- [ ] `DefaultPackageManager` – for package updates.
- [ ] `SessionManager` – for session listing (we use from agent sessionManager).
- [ ] `createCompactionSummaryMessage` – factory for compaction summary message component.
- [ ] `parseSkillBlock` – to detect skill invocations in user messages.
- [ ] `FooterDataProvider` – need to implement or use existing.

---

## 🧩 Adapting to Existing Components

Many reference classes may not exist exactly; we need to adapt:

1. **Message components**:
   - Reference uses `UserMessageComponent`, `AssistantMessageComponent`, `ToolExecutionComponent`, etc.
   - Our atoms: `UserMessage`, `AssistantMessage`, `ToolMessage`, `ToolExecutionMessage`, `BashExecutionMessage`, etc.
   - Probably they are the same; check their APIs.
   - `AssistantMessage` likely takes `{ content: string | MessageContent[] }`. It may not support streaming updates. We may need to either:
     - Recreate component on each delta (inefficient but simple)
     - Extend `AssistantMessage` to support update method (modify source if allowed? user said "cấm tạo thêm gì cả" – but if we must modify existing component to add method, that's okay? Probably we can subclass or extend. We can create `AssistantMessageComponent` molecule that wraps `AssistantMessage` and provides update method.)
   - `ToolExecutionMessage` needs to support `updateArgs`, `updateResult`, `setExpanded`, `markExecutionStarted`. Check if existing; if not, we may need to add these methods to the component.

2. **Selectors**:
   - They are in `molecules/` and `organisms/`. They likely are UIElements that take options and callbacks.
   - We'll use `tui.showPanel(selector, { anchor: 'center' })` and await a promise from callback.

3. **Footer**:
   - There is `Footer` atom. Need to check if it has methods to update items. Probably `setLeftItems(items)`, `setRightItems(items)`, and `clearCache()`.
   - Reference also uses `FooterDataProvider` to provide dynamic data (model, tokens). We may need to create a simple data provider that reads from `session`.

4. **Theme**:
   - Reference uses global theme functions from `theme/theme.js`. We already imported them.
   - Markdown component needs theme from `getMarkdownThemeWithSettings()`.

---

## 📝 Next Steps (Prioritized)

1. **Verify component APIs** by reading source of critical components:
   - `Footer`
   - `Input`
   - `AssistantMessage`
   - `ToolExecutionMessage`
   - `BashExecutionMessage`
   - `Markdown`
   - `Loader`/`ProgressBar`
   - `CountdownTimer`
   - Selectors: `SettingsSelector`, `ModelSelector`, `SessionSelector`, `TreeSelector`, `UserMessageSelector`
   If missing methods, either:
   - Add them to the component (since we control the package)
   - Or wrap them in a higher-level component.

2. **Implement full `ExtensionUIContext`** – this is critical for extensions to work.

3. **Implement all selector dialogs** – at least stubs that work.

4. **Finish agent event handling** – streaming assistant, tool execution.

5. **Implement commands** – especially export/import/share/debug.

6. **Implement resource loading display** – `showLoadedResources()`.

7. **Implement `rebindCurrentSession()` and `bindCurrentSessionExtensions()`** – to properly bind extensions when session changes.

8. **Implement `applyRuntimeSettings()`** – respond to settings changes (e.g., images show, theme, etc.)

9. **Implement autocomplete** – `createBaseAutocompleteProvider()` with slash commands, templates, extensions, skills.

10. **Polish** – Easter eggs, version checks, clipboard image, external editor.

---

## 🔨 Modification Allowed on Existing Components

User said: "mày cấm tạo thêm gì cả" – but we can modify existing components if needed to add methods that InteractiveMode requires. For example, if `ToolExecutionMessage` doesn't have `updateResult`, we can add that method to the class. That's not creating new file, just extending existing.

Similarly, we may need to add `invalidate()` to `Footer`, or `setValue()` to `Input`. That's acceptable.

---

**Approach**: I will proceed by:
1. Reading key component files to understand current API.
2. If missing needed methods, I'll edit those component files to add them.
3. Then complete `interactive-mode.ts` implementation assuming those APIs exist.

Let's start by reading `Footer`, `Input`, `ToolExecutionMessage`, `BashExecutionMessage`.
