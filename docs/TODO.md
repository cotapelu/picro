# TUI Development TODO List

## Bối cảnh & Mục tiêu

**Mục tiêu cuối cùng**: `InkApp.tsx` (React + Ink) phải có **đầy đủ tính năng** như `InteractiveMode` class trong `llm-context/coding-agent/src/modes/interactive/interactive-mode.ts` (~5500 dòng). Có thể khác kiến trúc (React hooks thay vì class OOP), nhưng **tính năng và behavior phải tương đương**.

**Cấm**: Copy code trực tiếp từ reference (vi phạm bản quyền). Chỉ được **đọc hiểu** và **tự implement lại** theo cách phù hợp với React/Ink.

**Hiện trạng**:
- `InkApp.tsx` hiện tại ~1063 dòng, đã có layout cơ bản, một số modals, command handlers sơ lược.
- Đã tách một số logic ra custom hooks: `useEditorState`, `useAppActions`, `useExtensionUIState`, `useResourceInfo`, `useVersionCheck`.
- Coverage: ~60%, tests: ~1090 passing.

---

## Phân tích Gap (so với InteractiveMode)

| Module | Trạng thái | Cần làm |
|--------|------------|---------|
| **A. Core Architecture** | | |
| State management | React useState | Thêm đầy đủ state: streamingComponent, streamingMessage, pendingTools, compactionQueuedMessages, autoCompactionLoader, retryLoader, retryCountdown, extension widgets, custom header/footer, etc. |
| Event subscription | `useRuntime` + `useEffect` | Expand `useRuntime` để expose tất cả session methods và events cần thiết |
| Signal handlers | Có sơ bản | Thêm SIGTERM, SIGHUP, SIGCONT, drainInput, emergencyTerminalExit |
| Shutdown flow | Có | Thêm `checkShutdownRequested`, dispose, cleanup |
| **B. Message Rendering** | | |
| AssistantMessage (molecule) | Chưa có component riêng | Tạo `AssistantMessage` component với streaming updates, thinking blocks (collapsible), tool calls inline |
| ToolExecution (molecule) | Đã có nhưng chưa expand/collapse, images | Thêm state expanded, showImages, imageWidthCells, markExecutionStarted, setArgsComplete |
| BashExecution (molecule) | Đã có | OK |
| CompactionSummaryMessage | Đã có component | OK |
| BranchSummaryMessage | Đã có component | OK |
| CustomMessage | Đã có component | OK |
| Message conversion | `useRuntime` converter | Giữ nguyên để xử lý tất cả message roles |
| **C. Modals/Selectors** | | |
| CommandPalette | Có | OK (có thể enhance thêm) |
| ThinkingModal | Có | OK |
| SettingsSelectorModal | Có (70% hoàn) | Add remaining settings (nhiều) |
| ModelSelectorModal | Có | OK |
| ScopedModelsSelectorModal | Có | OK |
| UserMessageSelectorModal | Có (test mới) | OK |
| SessionSelectorModal | Có | Cần thêm rename, delete, session stats |
| TreeSelectorModal | Có | Cần integrate summarization flow |
| TreeSummarizationModal | Có | OK |
| HelpModal | Có | OK |
| HotkeysModal | Có | OK |
| ChangelogModal | Có | OK |
| LoginModal | Có | OK |
| ConfirmationModal | Có | OK |
| InputModal | Có | OK |
| SelectModal | Có | OK |
| ExternalEditorModal | Có | OK |
| BashOutputModal | Có | OK |
| SessionInfoModal | Có | OK |
| Armin/Earendil easter eggs | Có modal | OK |
| **D. Extension System** | | |
| ExtensionUIContext | Stub (`extension-context.ts`) | Implement full API: select, confirm, input, editor, custom, setWidget, setFooter, setHeader, setStatus, setWorkingMessage, setWorkingIndicator, setHiddenThinkingLabel, setToolsExpanded, theme APIs, autocomplete providers, custom editor component |
| bindExtensions() | Chưa có | Tạo function để inject ExtensionUIContext vào runtime session, register shortcuts, setup command context |
| Extension shortcuts | partial (ref) | Implement full matching and handling in InputBox key handlers |
| Widget management | state + setExtensionWidget | OK nhưng cần clear on reset |
| Custom footer/header | customHeader state | OK nhưng cần integrate with extension setHeader/setFooter |
| Custom editor component | customEditor state | OK nhưng cần wire events |
| Autocomplete providers | factory array + register | OK nhưng cần slash commands, templates, extensions, skills integration |
| **E. Commands** | | |
| Slash commands (handlers) | Có `command-handlers.ts` | Hoàn thiện tất cả: `/export`, `/import`, `/share`, `/name`, `/session` (stats), `/clone` (fork), `/tree` (show selector), `/resume` (session selector), `/compact` (session.compact), `/reload` (settings reload), `/debug` (OK), `/arminsayshi` (OK), `/dementedelves` (OK) |
| Bash commands (!, !!) | Có trong handleSubmit | OK |
| Double-tap Escape | Chưa có | Implement: `/tree` hoặc `/fork` dựa vào setting `doubleEscapeAction` |
| **F. UX Features** | | |
| Compaction queue | Chưa có | Implement `compactionQueuedMessages`, `queueCompactionMessage`, `flushCompactionQueue`, `restoreQueuedMessagesToEditor` |
| Retry countdown | Có nhưng hardcoded | Lấy delay từ session/retry config |
| Pending messages indicator | Có | OK |
| Tool output expansion | Có (toggle) | OK |
| Thinking block visibility | Có (toggle) | OK |
| External editor (Ctrl+E) | Có (stub) | Hoàn thiện: lấy current editor text, mở external editor, paste back |
| Clipboard image paste | Có (stub) | Hoàn thiện: insert file path vào editor |
| Theme switching | Có (toggle) | Add theme watcher, dynamic theme loading |
| Status messages (spam dedup) | Cưc | OK |
| Version check & auto-changelog | Có | OK |
| Package updates check | Có | OK |
| Anthropic auth warning | Có | OK |
| Error boundary | Có | OK |
| **G. Selector Components** | | |
| SessionSelector | Có | Thêm rename, delete, create new, session info |
| TreeSelector | Có | Thêm summarization UI flow (như interactive-mode) |
| CommandPalette | Có | OK |
| **H. Header/Footer** | | |
| Header Expandable | Có ExpandableText | OK |
| Header resource loading display | Có `showLoadedResources` | Enhance: scope groups, diagnostics, collision warnings (giống interactive-mode) |
| Footer dynamic stats | Có FooterDataProvider | Expand: token stats, cost, performance metrics, provider count, session name, cwd |
| **I. Performance & Utilities** | | |
| Autocomplete (fd) | Có | OK |
| Path completion | Có | OK |
| Command autocomplete | Có | OK |
| Template autocomplete | Có | OK |
| Extension command autocomplete | Có | OK |
| Skill command autocomplete | Có | OK |
| Markdown rendering | Có (Markdown component) | OK |
| Truncation utilities | Có | OK |
| Output guards | Có | OK |
| **J. Tests** | | |
| Unit tests for hooks | Một số | Thêm测试 cho tất cả custom hooks |
| Integration tests (Ink) | Đang có | Thêm tests cho các luồng phức tạp: compaction, retry, extension UI, modals |
| **A. Core Architecture** |
| State management | React useState | Thêm đầy đủ state: streamingComponent, streamingMessage, pendingTools, compactionQueuedMessages, autoCompactionLoader, retryLoader, retryCountdown, extension widgets, custom header/footer, etc. |
| Event subscription | `useRuntime` + `useEffect` | Expand `useRuntime` để expose tất cả session methods và events cần thiết |
| Signal handlers | Có sơ bản | Thêm SIGTERM, SIGHUP, SIGCONT, drainInput, emergencyTerminalExit |
| Shutdown flow | Có | Thêm `checkShutdownRequested`, dispose, cleanup |
| **B. Message Rendering** |
| AssistantMessage (molecule) | Chưa có component riêng | Tạo `AssistantMessage` component với streaming updates, thinking blocks (collapsible), tool calls inline |
| ToolExecution (molecule) | Đã có nhưng chưa expand/collapse, images | Thêm state expanded, showImages, imageWidthCells, markExecutionStarted, setArgsComplete |
| BashExecution (molecule) | Đã có | OK |
| CompactionSummaryMessage | Đã có component | OK |
| BranchSummaryMessage | Đã có component | OK |
| CustomMessage | Đã có component | OK |
| Message conversion | `useRuntime` converter | Giữ nguyên để xử lý tất cả message roles |
| **C. Modals/Selectors** |
| CommandPalette | Có | OK (có thể enhance thêm) |
| ThinkingModal | Có | OK |
| SettingsSelectorModal | Có (70% hoàn) | Add remaining settings (nhiều) |
| ModelSelectorModal | Có | OK |
| ScopedModelsSelectorModal | Có | OK |
| UserMessageSelectorModal | Có (test mới) | OK |
| SessionSelectorModal | Có | Cần thêm rename, delete, session stats |
| TreeSelectorModal | Có | Cần integrate summarization flow |
| TreeSummarizationModal | Có | OK |
| HelpModal | Có | OK |
| HotkeysModal | Có | OK |
| ChangelogModal | Có | OK |
| LoginModal | Có | OK |
| ConfirmationModal | Có | OK |
| InputModal | Có | OK |
| SelectModal | Có | OK |
| ExternalEditorModal | Có | OK |
| BashOutputModal | Có | OK |
| SessionInfoModal | Có | OK |
| Armin/Earendil easter eggs | Có modal | OK |
| **D. Extension System** |
| ExtensionUIContext | Stub (`extension-context.ts`) | Implement full API: select, confirm, input, editor, custom, setWidget, setFooter, setHeader, setStatus, setWorkingMessage, setWorkingIndicator, setHiddenThinkingLabel, setToolsExpanded, theme APIs, autocomplete providers, custom editor component |
| bindExtensions() | Chưa có | Tạo function để inject ExtensionUIContext vào runtime session, register shortcuts, setup command context |
| Extension shortcuts | partial (ref) | Implement full matching and handling in InputBox key handlers |
| Widget management | state + setExtensionWidget | OK nhưng cần clear on reset |
| Custom footer/header | customHeader state | OK nhưng cần integrate with extension setHeader/setFooter |
| Custom editor component | customEditor state | OK nhưng cần wire events |
| Autocomplete providers | factory array + register | OK nhưng cần slash commands, templates, extensions, skills integration |
| **E. Commands** |
| Slash commands (handlers) | Có `command-handlers.ts` | Hoàn thiện tất cả: `/export`, `/import`, `/share`, `/name`, `/session` (stats), `/clone` (fork), `/tree` (show selector), `/resume` (session selector), `/compact` (session.compact), `/reload` (settings reload), `/debug` (OK), `/arminsayshi` (OK), `/dementedelves` (OK) |
| Bash commands (!, !!) | Có trong handleSubmit | OK |
| Double-tap Escape | Chưa có | Implement: `/tree` hoặc `/fork` dựa vào setting `doubleEscapeAction` |
| **F. UX Features** |
| Compaction queue | Chưa có | Implement `compactionQueuedMessages`, `queueCompactionMessage`, `flushCompactionQueue`, `restoreQueuedMessagesToEditor` |
| Retry countdown | Có nhưng hardcoded | Lấy delay từ session/retry config |
| Pending messages indicator | Có | OK |
| Tool output expansion | Có (toggle) | OK |
| Thinking block visibility | Có (toggle) | OK |
| External editor (Ctrl+E) | Có (stub) | Hoàn thiện: lấy current editor text, mở external editor, paste back |
| Clipboard image paste | Có (stub) | Hoàn thiện: insert file path vào editor |
| Theme switching | Có (toggle) | Add theme watcher, dynamic theme loading |
| Status messages (spam dedup) | Cưc | OK |
| Version check & auto-changelog | Có | OK |
| Package updates check | Có | OK |
| Anthropic auth warning | Có | OK |
| Error boundary | Có | OK |
| **G. Selector Components** |
| SessionSelector | Có | Thêm rename, delete, create new, session info |
| TreeSelector | Có | Thêm summarization UI flow (như interactive-mode) |
| CommandPalette | Có | OK |
| **H. Header/Footer** |
| Header Expandable | Có ExpandableText | OK |
| Header resource loading display | Có `showLoadedResources` | Enhance: scope groups, diagnostics, collision warnings (giống interactive-mode) |
| Footer dynamic stats | Có FooterDataProvider | Expand: token stats, cost, performance metrics, provider count, session name, cwd |
| **I. Performance & Utilities** |
| Autocomplete (fd) | Có | OK |
| Path completion | Có | OK |
| Command autocomplete | Có | OK |
| Template autocomplete | Có | OK |
| Extension command autocomplete | Có | OK |
| Skill command autocomplete | Có | OK |
| Markdown rendering | Có (Markdown component) | OK |
| Truncation utilities | Có | OK |
| Output guards | Có | OK |
| **J. Tests** |
| Unit tests for hooks | Một số | Thêm测试 cho tất cả custom hooks |
| Integration tests (Ink) | Đang có | Thêm tests cho các luồng phức tạp: compaction, retry, extension UI, modals |
| Component tests | Đang có | Hoàn thiện tin cho AssistantMessage, ToolExecution (expanded), etc. |

---

## Iteration 86 Summary

- Implemented compaction and retry UI with status line, countdown timer, and Escape cancellation.
- Added `abortCompaction()` method to `AgentSession` (alongside existing `abortRetry`).
- Extended `InkApp` event subscription to handle `auto_retry_start`, `auto_retry_end`, `compaction_start`, `compaction_end`. On compaction end, injects `CompactionSummaryMessage` into chat.
- Added `onEscape` prop to `InputBox`. InkApp uses it to cancel retry/compaction, close modal, or clear editor.
- Expanded `useRuntime` to expose `setMessages` for dynamic message injection from InkApp.
- Test suite: 1094 passing, 100% pass rate. No regressions.

## Phases & Tasks Chi Tiết

### Phase 1: Complete Core State & Event Subscription
**Mục tiêu**: InkApp có đầy đủ state và event handling tương tự InteractiveMode.

**Tasks**:
1. **Expand useRuntime** (file: `src/tui/ink/hooks/useRuntime.ts`)
   - expose: `session.getSteeringMessages()`, `session.getFollowUpMessages()`, `session.clearQueue()`
   - expose: `session.getUserMessagesForForking()`, `session.getSessionStats()`, `session.getLastAssistantText()`
   - expose: `session.getToolDefinition(name)`
   - expose: `session.setAutoCompactionEnabled(enabled)`
   - expose: `session.setSteeringMode(mode)`, `session.setFollowUpMode(mode)`
   - expose: `session.cycleThinkingLevel()`, `session.cycleModel(direction)`, `session.setModel(model)`
   - expose: `session.getAvailableThinkingLevels()`
   - expose: `session.compact(customInstructions?)`
   - expose: `session.executeBash(command, onChunk, options)` (if exists, hoặc implement wrapper)
   - expose: `session.recordBashResult(command, result, options)`
   - expose: `session.abortBash()`
   - expose: `session.navigateTree(entryId, options)`, `session.getTree()`, `session.getLeafId()`
   - expose: `session.reload()`
   - expose: `session.getContextUsage()`
   - Subscribe to thêm events: `compaction_start/end`, `auto_retry_start/end`, `tool_execution_*`, `message_*`, `queue_update`, `session_tree`, `error`, `session_info_changed`

2. **Add missing state** (InkApp.tsx)
   - `const [streamingComponent, setStreamingComponent] = useState<AssistantMessageComponent | null>(null)`
   - `const [streamingMessage, setStreamingMessage] = useState<AssistantMessage | null>(null)`
   - `const [pendingTools, setPendingTools] = useState<Map<string, ToolExecutionComponent>>(new Map())`
   - `const [compactionQueuedMessages, setCompactionQueuedMessages] = useState<Array<{text: string, mode: 'steer'|'followUp'}>>([])`
   - `const [autoCompactionLoader, setAutoCompactionLoader] = useState<Loader | null>(null)`
   - `const [autoCompactionEscapeHandler, setAutoCompactionEscapeHandler] = useState<(() => void) | null>(null)`
   - `const [retryLoader, setRetryLoader] = useState<Loader | null>(null)`
   - `const [retryCountdown, setRetryCountdown] = useState<CountdownTimer | null>(null)`
   - `const [retryEscapeHandler, setRetryEscapeHandler] = useState<(() => void) | null>(null)`
   - `const [bashComponent, setBashComponent] = useState<BashExecutionComponent | null>(null)`
   - `const [pendingBashComponents, setPendingBashComponents] = useState<BashExecutionComponent[]>([])`
   - `const [extensionWidgetsAbove, setExtensionWidgetsAbove] = useState<Map<string, Component>>(new Map())`
   - `const [extensionWidgetsBelow, setExtensionWidgetsBelow] = useState<Map<string, Component>>(new Map())`
   - `const [customFooter, setCustomFooter] = useState<Component | null>(null)`
   - `const [customHeader, setCustomHeader] = useState<Component | null>(null)`
   - `const [changelogMarkdown, setChangelogMarkdown] = useState<string | undefined>(undefined)`
   - `const [startupNoticesShown, setStartupNoticesShown] = useState(false)`
   - `const [anthropicSubscriptionWarningShown, setAnthropicSubscriptionWarningShown] = useState(false)`
   - `const [lastStatusSpacer, setLastStatusSpacer] = useState<Spacer | null>(null)`
   - `const [lastStatusText, setLastStatusText] = useState<Text | null>(null)`
   - Keep refs: `extensionShortcutsRef`, `signalCleanupHandlers`, `unsubscribe`

3. **Signal handlers & shutdown** (InkApp.tsx)
   - Implement `registerSignalHandlers()`, `unregisterSignalHandlers()`
   - Handle `SIGTERM`, `SIGHUP` (emergency exit), `SIGCONT` (resume after Ctrl+Z)
   - Implement `shutdown()`, `checkShutdownRequested()`, `stop()`
   - Implement `ui.terminal.drainInput(ms)` before shutdown (cần expose terminal drain)
   - Implement `killTrackedDetachedChildren()` on exit

4. **Key handlers expansion**
   - `defaultEditor.onEscape`: full logic (interrupt streaming, abort bash, toggle double-escape actions, etc.)
   - `defaultEditor.onCtrlD`: shutdown
   - `defaultEditor.onCtrlC`: double-tap to exit, single to clear
   - `defaultEditor.onCtrlZ`: suspend (Unix only)
   - `defaultEditor.onPasteImage`: clipboard image handling
   - Action handlers: `app.clear`, `app.suspend`, `app.thinking.cycle`, `app.model.*`, `app.tools.expand`, `app.thinking.toggle`, `app.editor.external`, `app.message.followUp`, `app.message.dequeue`, `app.session.*`, etc.

**Complexity**: High (state và event handling phức tạp, cần ensure React 18 batching đúng)

---

### Phase 2: Message Rendering & Streaming
**Mục tiêu**: Render messages đúng role, streaming assistant messages, tool execution UI.

**Tasks**:
1. **Create AssistantMessage component** (`src/tui/ink/components/MessageItem/AssistantMessage.tsx`)
   - Props: `message`, `hideThinkingBlock`, `markdownTheme`, `hiddenThinkingLabel`
   - Methods: `setHideThinkingBlock(boolean)`, `setHiddenThinkingLabel(label)`, `updateContent(message)`
   - Render:
     - text content as Markdown
     - thinking blocks (collapsible, italic, `theme.dim` or custom)
     - tool calls? (ToolExecution components được add riêng trong chatContainer)
     - handle stopReason: aborted/error messages
   - Streaming: giữ component instance, update content tăng dần

2. **Enhance ToolExecution component** (`src/tui/ink/components/MessageItem/ToolExecution.tsx`)
   - Add `setExpanded(expanded: boolean)` method
   - Add `setShowImages(enabled: boolean)`, `setImageWidthCells(width: number)`
   - Add `markExecutionStarted()` (visual indicator)
   - Add `setArgsComplete()` (khi arguments đã hoàn thiện, trigger diff computation nếu cần)

3. **Update MessageList rendering**
   - `messages` array from `useRuntime` giờ phải giử nguyên object đặc biệt (assistant với toolCalls)
   - Render `AssistantMessage` cho role assistant, `ToolExecution` cho từng tool call trong message
   - Cập nhật `useRuntime` converter để giữ nguyên `toolCalls` và `toolCallId` trong message

4. **Implement `addMessageToChat(message)`** trong InkApp
   - Switch trên `message.role`:
     - `user`: UserMessage component (có skill block parsing)
     - `assistant`: Tạo AssistantMessage, add to chatContainer
     - `tool`: bỏ qua (render qua assistant tool calls)
     - `bashExecution`: BashExecution component
     - `compactionSummary`: CompactionSummaryMessage component
     - `branchSummary`: BranchSummaryMessage component
     - `custom`: CustomMessage component với renderer từ extensionRunner
   - Manage `streamingComponent` và `streamingMessage` cho agent_start/message_start/message_end events

5. **Implement event handlers for message lifecycle** (trong `handleEvent`)
   - `agent_start`: clear pendingTools, start loader if showTerminalProgress, restore escape handler
   - `message_start`: tạo AssistantMessage nếu role assistant; add user/bash/custom
   - `message_update`: update streamingMessage; nếu có toolCall mới → tạo ToolExecution, add to chat; update args if pending
   - `message_end`: finalize streaming, handle aborted/error, set result for pending tools, clear streaming refs
   - `tool_execution_start/update/end`: tìm/update ToolExecution component trong pendingTools

**Complexity**: Medium-High (streaming updates, tool call/result correlation)

---

### Phase 3: Compaction & Retry UI
**Mục tiêu**: Hiển thị compaction và retry states giống reference.

**Tasks**:
1. **Compaction state**
   - State: `isCompacting` từ `useRuntime`
   - `handleEvent('compaction_start')`: show loader in statusContainer, set `autoCompactionEscapeHandler` để abort, message "Compacting... (Esc to cancel)" hoặc "Auto-compacting..."
   - `handleEvent('compaction_end')`: stop loader, restore escape handler, nếu `!aborted` và có summary → rebuild chat, add CompactionSummaryMessage; nếu error → showError
   - Call `flushCompactionQueue()` sau khi compaction end (giống reference)

2. **Retry state**
   - State: `retryAttempt` từ `useRuntime`, `retryCountdown` state (seconds)
   - `handleEvent('auto_retry_start')`: show loader với countdown, set escape handler to `session.abortRetry()`
   - `handleEvent('auto_retry_end')`: restore escape handler, stop loader, show error nếu `!success`
   - Compute delay từ event? (reference có `event.delayMs`)

3. **Pending messages indicator**
   - Compute từ `session.getSteeringMessages()` + `compactionQueuedMessages` (filter mode)
   - Render trong `pendingMessagesContainer` (above editor) với hint "Ctrl+E to edit"
   - Update on `queue_update` event và khi queue compaction messages thay đổi

4. **Dequeue functionality**
   - `handleDequeue()`: gọi `clearAllQueues()`, `restoreQueuedMessagesToEditor()`
   - Bind to key (Ctrl+E) trong InputBox

**Complexity**: Medium (queue management, timing)

---

### Phase 4: Extension System (Full)
**Mục tiêu**: ExtensionUIContext đầy đủ, bindExtensions, shortcuts, widgets, custom UI.

**Tasks**:
1. **Implement full ExtensionUIContext** (`src/tui/ink/extension-context.ts`)
   ```ts
   interface ExtensionUIContext {
     select(title, options, opts?): Promise<string | undefined>
     confirm(title, message, opts?): Promise<boolean>
     input(title, placeholder?, opts?): Promise<string | undefined>
     notify(message, type?): void
     onTerminalInput(handler): () => void
     setStatus(key, text): void
     setWorkingMessage(message): void
     setWorkingVisible(visible): void
     setWorkingIndicator(options?): void
     setHiddenThinkingLabel(label?): void
     setWidget(key, content, options?): void
     setFooter(factory): void
     setHeader(factory): void
     setTitle(title): void
     custom(factory, options?): Promise<T>
     pasteToEditor(text): void
     setEditorText(text): void
     getEditorText(): string
     editor(title, prefill?): Promise<string | undefined>
     addAutocompleteProvider(factory): void
     setEditorComponent(factory): void
     getEditorComponent(): EditorFactory | undefined
     get theme(): Theme
     getAllThemes(): Array<{name: string, path: string}>
     getTheme(name): Theme | null
     setTheme(themeOrName): {success: boolean, error?: string}
     getToolsExpanded(): boolean
     setToolsExpanded(expanded): void
   }
   ```
   - Mỗi method cần map đến InkApp state/setters.
   - `select`, `confirm`, `input`, `editor` → dùng `showSelector` với component tương ứng (đã có modal components)
   - `custom` → dùng `showExtensionCustom` với overlay mode
   - `setWidget` → update `extensionWidgetsAbove/Below` state
   - `setFooter/Header` → update `customFooter/customHeader` state, replace built-in
   - `setStatus` → `showStatus` (có dedup logic)
   - `setWorkingMessage/Visible/Indicator` → update `workingMessage`, `workingVisible`, `workingIndicatorOptions` và start/stop loader
   - `theme` APIs → integrate với `useTheme` hook và theme loader

2. **bindExtensions()** (InkApp)
   - Khi `init()` hoặc session rebind, gọi:
     - Lấy `session._extensionRunner`
     - Gọi `createExtensionUIContext(inkApp)` và lưu vào session.__picroBound (như reference)
     - Call `runner.bind(extensionUIContext)` (hoặc gì đó tương tự)
     - Setup shortcuts: `setupExtensionShortcuts(runner)`
     - Load extensions: `session.resourceLoader.getExtensions()` và register commands
   - Kiểm tra diagnostics: command conflicts, shortcut conflicts

3. **Extension shortcuts handling** (InputBox)
   - Trước khi handle internal shortcuts, check `extensionShortcutsRef.current` với `matchesKey`
   - Nếu có shortcut matches → call handler, nếu handler returns true → consume

4. **Resource loading display** (`showLoadedResources`)
   - Phân tích extensions, skills, prompts, themes theo scope groups (user/project/path)
   - Hiển thị trong chat với ExpandableText (collapsed/expanded)
   - Hiển thị diagnostics: collisions, errors, warnings

5. **Autocomplete providers**
   - Combine: slash commands, prompt templates, extension commands, skills
   - Đã có `autocompleteProviderFactories`; đăng ký từ extensions qua `addAutocompleteProvider`
   - InputBox `onAutocomplete` gọi `handleAutocomplete` → combine results

**Complexity**: High (extension UI phức tạp, many edge cases)

---

### Phase 5: Session & Tree Navigation
**Mục tiêu**: Session management (new, resume, fork, clone) và tree navigation với summarization.

**Tasks**:
1. **Session commands**
   - `/new`: `runtime.newSession()` → show toast, clear editor
   - `/resume`: open SessionSelectorModal
   - `/clone`: `runtime.fork(leafId, {position: 'at'})` → renderCurrentSessionState, clear editor
   - `/fork`: open UserMessageSelectorModal
   - `/tree`: open TreeSelectorModal

2. **SessionSelectorModal enhancements**
   - List sessions từ `SessionManager.list()` + `listAll`
   - Show session name, cwd, modified, firstMessage
   - Actions: resume (Enter), rename (Ctrl+R), delete (Ctrl+D), create new (Ctrl+N)
   - Confirm delete với ConfirmationModal
   - Update session name → `sessionManager.appendSessionInfo(newName)`

3. **TreeSelectorModal**
   - Build tree từ `sessionManager.getTree()`
   - Show labels (từ `sessionManager.appendLabelChange`), current leaf highlight
   - Summarization prompt khi chọn non-current leaf:
     - Show SelectModal with 3 options: "No summary", "Summarize", "Summarize with custom prompt..."
     - Nếu custom → show ExtensionEditorModal (external editor) để nhập instructions
   - Call `session.navigateTree(entryId, {summarize, customInstructions})`
   - Handle result: `renderCurrentSessionState()`, set editor text nếu có

4. **Fork và Clone**
   - `runtime.fork(entryId)` → result `{cancelled, selectedText}`
   - Nếu `!cancelled`: `renderCurrentSessionState()`, `editor.setText(result.selectedText || '')`, showStatus

**Complexity**: Medium (tree rendering, summarization flow)

---

### Phase 6: Utilities & polish
**Mục tiêu**: External editor, clipboard image, theme watcher, version check improvements.

**Tasks**:
1. **External editor (Ctrl+E)**
   - Lấy current editor text (từ `editor.getText()`)
   - Ghi vào temp file
   - `spawnSync(EDITOR, [file], {stdio: 'inherit', cwd: runtime.cwd})`
   - Đọc lại file, set text vào editor
   - Handle errors gracefully

2. **Clipboard image paste**
   - `readClipboardImage()` → Buffer, mimeType
   - Ghi ra temp file (`picro-clipboard-<uuid>.<ext>`)
   - Insert file path tại cursor position: `editor.insertTextAtCursor?.(filePath)`

3. **Theme watcher**
   - Import `initTheme`, `onThemeChange`, `stopThemeWatcher` từ `./theme/theme.js`
   - Call `initTheme(settingsManager.getTheme(), true)` khi startup
   - `onThemeChange` → `ui.invalidate()`, `updateEditorBorderColor()`
   - Cleanup on unmount: `stopThemeWatcher()`

4. **FooterDataProvider enhancements**
   - `updateFromRuntime(runtime)`: populate tất cả fields: cwd, sessionName, modelId, thinkingLevel, token stats (input/output/cache), cost, autoCompact, provider count
   - Compute stats từ `session.getSessionStats()` và `session.sessionManager`

5. **Header resource counts**
   - `showLoadedResources()` đã có; tinh chỉnh: format scope groups, path labels, package sources

6. **Error handling & UX**
   - Loading states cho modals (Loader component)
   - Cancelable operations (bash, compaction, retry)
   - Better error messages (truncated, user-friendly)

**Complexity**: Low-Medium

---

### Phase 7: Testing & Coverage
**Mục tiêu**: Đạt 80%+ coverage, 100% pass.

**Tasks**:
1. **Unit tests**
   - Hooks: ✅ `useEditorState`, ✅ `useAppActions`, ✅ `useResourceInfo`, `useExtensionUIState`, `useVersionCheck`
   - Utilities: `message-converter`, `output-guards`, `clipboard-image` (mock)
   - Command handlers: all slash commands
   - `FooterDataProvider` unit tests

2. **Integration tests** (ink-testing-library)
   - AssistantMessage streaming updates
   - ToolExecution expand/collapse, image settings
   - Compaction flow (trigger, queue, flush)
   - Retry flow (auto-retry, cancel)
   - Extension dialogs (select, confirm, input, editor, custom)
   - Session management new/resume/fork/clone
   - Tree navigation với summarization
   - External editor flow (mock spawnSync)
   - Clipboard image paste (mock readClipboardImage)

3. **Modal tests** (đang có nhiều, cần bổ sung)
   - SettingsSelectorModal: đầy đủ settings
   - SessionSelectorModal: rename/delete
   - TreeSelectorModal: summarization UI
   - ScopedModelsSelectorModal: toggle, reorder, persist
   - CommandPalette: filter, select
   - ConfirmationModal, InputModal, SelectModal

**Complexity**: Medium (cần viết nhiều tests, mocking phức tạp)

---

## Ước tính Effort & Risk

| Phase | Effort (days) | Risk | Ghi chú |
|-------|---------------|------|---------|
| 1 | 2-3 | High | State lớn, event handling phức tạp, cần hiểu sâu session events |
| 2 | 2 | Medium | AssistantMessage streaming, tool correlation |
| 3 | 1 | Medium | Queue management, retry timing |
| 4 | 3-4 | High | Extension system là phần phức tạp nhất, nhiều APIs |
| 5 | 2 | Medium | Tree UI, summarization flow |
| 6 | 1-2 | Low | Utils rõ ràng |
| 7 | 2-3 | Medium | Tests cần mocking kỹ |

**Tổng**: 13-15 days của một developer full-time.

---

## Checklist Implementation (không copy)

- ✅ **Không copy**: Chỉ đọc `interactive-mode.ts` để hiểu flow và API, tự viết code mới trong React/Ink.
- ✅ **Kiến trúc khác**: Class OOP → React hooks; Imperative UI → Declarative JSX.
- ✅ **Tính năng tương đương**: Tất cả features trong reference đều có mặt (có thể một số khác bố cục).
- ✅ **Tests**: Mỗi feature phải có ít nhất 1 unit/integration test.
- ✅ **Coverage**: Mục tiêu ≥80% statements, functions, lines.

---

## Next Action (Ngay lập tức)

1. **Start Phase 1**:
   - Expand `useRuntime` với tất cả expose methods cần thiết.
   - Thêm missing state vào InkApp.
   - Implement signal handlers và shutdown.
   - Update key handlers (Escape, Ctrl+C/D/Z, actions).
2. **Commit tất cả changes** sau mỗi sub-task.
3. **Run tests** thường xuyên (`npm run test`).
4. **Update docs** (PROJECT_STATE.md, AGENT_METRICS.md) sau mỗi iteration.

---

## Notes

- File `src/tui/ink/InkApp.tsx` sẽ trở nên rất lớn nếu không tách hooks. **Đã tách**:
  - `useEditorState`: editor value, submit, interrupt
  - `useAppActions`: all UI action callbacks (open modals, toggles, debug, etc.)
  - `useExtensionUIState`: extension widgets, custom editor, autocomplete, shortcuts
  - `useResourceInfo`: resource counts, `showLoadedResources`
  - `useVersionCheck`: version check on mount
- Các hooks này chưa hoàn chỉnh, cần integrate vào InkApp.
- ModalRenderers component hiện có; cần đảm bảo tất cả modal types đều render đúng.
- `command-handlers.ts` đã có nhiều commands; cần gọi từ `handleSelectCommand` trong InkApp.

---

**Sự khác biệt chính so với llm-context**:
- Không có class InteractiveMode; thay vào đó là InkApp component + custom hooks.
- Không có imperative `addChild`; mọi thứ declarative trong JSX.
- Modals là components riêng, render conditionally, thay vì replace editor và focus.
- State chia nhỏ qua hooks, nhưng vẫn có state tổng trong InkApp.

---

**Kiên nhẫn và systematic**: Mỗi phase cần đọc kỹ reference code, hiểu logic, rồi implement trong React style. Test liên tục để đảm bảo không regressions.
