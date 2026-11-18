# TODO.md – Évolution Backlog

> Danh sách đầy đủ các công việc cần làm để đưa `picro` lên ngang ngửa (hoặc vượt quá) `pi-mono`.
> **Quy tắc:** Không copy code từ pi-mono. Tham khảo hành vi/UX/api, tự viết lại theo kiến trúc Ink + React của picro.

---

## 📋 PHASE 1: TUI CORE FOUNDATION (Blocking - Ưu tiên cao nhất)

### 1.1 Keyboard Protocol (`src/tui/ink/core/Keys.ts` → rewrite hoàn toàn)
- [ ] **Kitty CSI-u protocol** (flags 1, 2, 4):
  - [ ] Flag 1: Disambiguate escape codes (CSI-u cho mọi phím)
  - [ ] Flag 2: Event types (press/repeat/release) → `isKeyRelease()`, `isKeyRepeat()`
  - [ ] Flag 4: Alternate keys (shifted key, base layout key cho non-Latin layouts)
- [ ] **xterm modifyOtherKeys** (CSI 27 ; mod ; keycode ~) fallback khi Kitty không có
- [ ] **Legacy sequences** đầy đủ: arrows, function keys, modified arrows (shift/ctrl/alt), home/end/insert/delete/pageUp/pageDown, clear
- [ ] **Key identifiers** type-safe (`KeyId` union + `Key` helper object với autocomplete)
- [ ] **Printable decoding**: `decodePrintableKey(data)` cho CSI-u + modifyOtherKeys
- [ ] **Native modifier detection**: macOS/Windows Shift+Enter thật (không phải Ink nuốt ESC)
- [ ] **Global Kitty protocol state**: `setKittyProtocolActive()`, `isKittyProtocolActive()`

### 1.2 Terminal Class (`src/tui/ink/core/Terminal.ts` → rewrite) ✅ **HOÀN THÀNH**
- [x] `ProcessTerminal` class implement interface `Terminal`
- [x] Raw mode management (enable/disable, restore on exit)
- [x] **Kitty protocol negotiation**: query flags → enable CSI-u/modifyOtherKeys fallback
- [x] **Bracketed paste mode** (ESC [?2004h/l) → forward paste events
- [x] **SIGWINCH handling** + `refreshTerminalDimensions()`
- [x] **OSC 7501 Program Status** (working/blocked/done/error) → `setProgramStatus()`
- [x] **Progress indicator** OSC 9;4 (indeterminate) → `setProgress()`
- [x] **Window title** OSC 0 → `setTitle()`
- [x] **Cursor visibility/movement** → `hideCursor()`, `showCursor()`, `moveBy()`
- [x] **Clear operations** → `clearLine()`, `clearFromCursor()`, `clearScreen()`
- [x] **Drain input** on exit (tránh key release leak qua SSH) → `drainInput()`
- [x] **Windows VT Input** (ENABLE_VIRTUAL_TERMINAL_INPUT) cho Shift+Tab
- [x] **Keyboard protocol pushed tracking** → disable đúng khi stop()
- [x] **Write logging** (PI_TUI_WRITE_LOG) cho debug
- [x] **Native modifier detection**: macOS/Windows Shift+Enter thật (không phải Ink nuốt ESC)
- [x] **Keyboard protocol negotiation buffer** - handling split responses across reads
- [x] **Proper DA1 sentinel handling** - tracking pending DA1 replies
- [x] **modifyOtherKeysActive getter** - for external access
- [x] **programStatusQueryPending** tracking

### 1.3 Stdin Buffer (`src/tui/ink/core/StdinBuffer.ts` → new) ✅ **HOÀN THÀNH**
- [x] Reassemble batched escape sequences với escape timeout configurable
- [x] Phát hiện Kitty protocol response (split across reads)
- [x] Emit `data` events cho từng sequence hoàn chỉnh
- [x] Emit `paste` events cho bracketed paste content
- [x] Destroy/cleanup proper
- [x] Streaming UTF-8 decoder cho multi-byte sequences
- [x] C1 control character handling
- [x] SGR mouse sequence detection
- [x] Terminal reply header pattern recognition

### 1.4 Layout Engine (`src/tui/ink/core/Container.ts`, `ScrollView.ts`, `TuiTypes.ts`) ✅ **HOÀN THÀNH**
- [x] `Component` interface: `render(width): string[]`, `invalidate()`, `handleInput()`, `handleMouse()`
- [x] `Focusable` interface: `focused`, `capturesViewportInput`
- [x] `Container`: flex children với `basis/grow/shrink/minSize/maxSize`
- [x] `VStack` / `HStack`: layout dọc/ngang với flexbox semantics
- [x] `ScrollView`: virtual scrolling, `follow: "end" | "start" | "none"`, `overscroll: "chain" | "hidden" | "clamp"`, scrollbar auto/always/hidden
- [x] `ScrollViewScrollbar` type: `"auto" | "always" | "hidden"` + track/thumb styles
- [x] Layout node: tính toán size, position, render children
- [x] Mouse wheel scroll handling
- [x] Scrollbar dragging support
- [x] PageUp/PageDown, Home/End, Ctrl+Up/Down navigation

### 1.5 Base TUI Classes (`src/tui/ink/core/TUI.ts`, `TuiTypes.ts`) ✅ **HOÀN THÀNH**
- [x] `TUI` base class: component tree, focus management, render loop, mouse handling
- [x] `TuiMainScreen`: regular mode (normal scrollback) với render state capture/restore
- [x] `TuiAltScreen`: fullscreen alt-screen mode (alternate screen buffer)
- [x] Mouse protocol: SGR 1006/1015, wheel scroll, click, drag, release
- [x] Proxy reference pattern cho renderer swapping (`createTuiReference`)
- [x] Overlay stack management cho fullscreen mode
- [x] Selection support với copy-on-select
- [x] Right-click paste handler
- [x] Search match styling

---

## 📋 PHASE 2: CORE COMPONENTS

### 2.1 Editor (`src/tui/ink/components/Editor.tsx` → rewrite hoàn toàn theo pi-mono) ✅ **HOÀN THÀNH**
- [x] **State**: `lines[]`, `cursorLine`, `cursorCol` (logic, không phải visual)
- [x] **Visual line map**: `buildVisualLineMap()` map dòng logic → các visual line sau wrap
- [x] **Word wrap**: `wordWrapLine()` với wrap opportunity tại whitespace/CJK, atomic segment cho paste marker
- [x] **Sticky column** (`preferredVisualCol`): di chuyển dọc giữ cột visual, snap khi dòng ngắn hơn
- [x] **History**: Up/Down navigate, `historyDraft` khôi phục khi về -1, limit 100
- [x] **Kill Ring**: Emacs-style kill/yank/yankPop với accumulate
- [x] **Undo Stack**: Snapshot full state + pastes registry + counter, coalesce typing
- [x] **Paste markers**: `[paste #N +X lines/chars]` cho paste lớn (>10 lines hoặc >1000 chars), registry Map<id, content>, renumber khi xóa
- [x] **Autocomplete**: Slash commands (`/`) + file paths (`@`, `#`, `~`, `.`, `/`), fuzzy filter, debounce
- [x] **External Editor** (Ctrl+G): Mở $EDITOR với content đã expand paste markers
- [x] **Clipboard Paste** (Ctrl+V): Text/images, prepend space cho path readability
- [x] **Jump to Char** (Ctrl+]): Forward/backward tìm ký tự
- [x] **Page Scroll**: 30% terminal height, min 5 lines, giữ sticky column
- [x] **Word Navigation**: Ctrl+Left/Right, Alt+Backspace/Delete
- [x] **Delete Operations**: Char/Word/Line start/end, Forward/Backward
- [x] **Bash Mode**: Border color đổi khi dòng bắt đầu bằng `!` / `!!`
- [x] **Search Integration**: Route keys khi `searchActive`
- [x] **App Actions**: Forward Ctrl+C/D/Z, Esc, Ctrl+G/V/P/N/O/Y, Ctrl+Shift+P/N/T/F lên parent

### 2.2 Input (`src/tui/ink/components/Input.tsx` → enhance)
- [ ] Single-line với horizontal scroll (cursor centered)
- [ ] Kill ring, undo, word navigation, delete to line start/end
- [ ] Bracketed paste handling
- [ ] Kitty printable decoding

### 2.3 SelectList (`src/tui/ink/components/SelectList.tsx` → enhance) ✅ **HOÀN THÀNH**
- [x] Pagination (PageUp/PageDown), mouse click, keyboard nav (Up/Down wrap)
- [x] Layout: primary column (min/max width) + description column
- [x] Scroll indicator khi có nhiều item hơn visible
- [x] Focusable, capturesViewportInput khi mở

### 2.4 SettingsList (`src/tui/ink/components/SettingsList.tsx` → new) ✅ **HOÀN THÀNH**
- [x] SettingItem: id, label, description, currentValue, values[], submenu factory
- [x] Search filter (type-to-search)
- [x] Submenu navigation (Enter mở, Esc quay lại)
- [x] SteppedSubmenu (multi-step wizard) + SelectSubmenu (single select)

### 2.5 ScrollView (`src/tui/ink/components/ScrollView.tsx` → new)
- [ ] Virtual rendering chỉ visible lines
- [ ] `follow: "end"` auto-scroll khi content mới
- [ ] `overscroll: "chain"` chuyển scroll cho parent khi chạm đáy/đầu
- [ ] Scrollbar: auto/always/hidden, custom track/thumb styles
- [ ] Mouse wheel scroll, drag scrollbar

### 2.6 Container / VStack / HStack (`src/tui/ink/components/Stack.tsx` → enhance)
- [ ] Flexbox semantics: basis/grow/shrink/minSize
- [ ] Render children, tính layout

---

## 📋 PHASE 3: THEME SYSTEM

### 3.1 Theme Tokens (`src/tui/ink/theme/theme-tokens.ts` → new)
- [ ] 100+ semantic tokens:
  - Base: `text`, `muted`, `dim`, `accent`, `warning`, `error`, `success`, `borderMuted`, `selectedBg`
  - Syntax: `syntaxKeyword`, `syntaxType`, `syntaxFunction`, `syntaxVariable`, `syntaxNumber`, `syntaxString`, `syntaxComment`, `syntaxOperator`, `syntaxPunctuation`
  - Tool: `toolDiffAdded`, `toolDiffRemoved`, `toolOutput`, `toolError`
  - Thinking: `thinkingOff`, `thinkingMinimal`, `thinkingLow`, `thinkingMedium`, `thinkingHigh`, `thinkingXhigh`, `thinkingMax`
  - UI: `bashMode`, `scrollbarTrack`, `scrollbarThumb`, `searchMatchBg`, `searchMatchText`, `searchCurrentMatchBg`
  - Markdown: `mdHeading`, `mdLink`, `mdLinkUrl`, `mdCode`, `mdCodeBlock`, `mdCodeBlockBorder`, `mdQuote`, `mdQuoteBorder`, `mdHr`, `mdListBullet`

### 3.2 Theme Class (`src/tui/ink/theme/theme.ts` → rewrite)
- [ ] Token resolution: fg/bg ANSI sequences precomputed
- [ ] **Dim tokens**: foreground tokens rendered faint (SGR 2)
- [ ] **Default tokens**: `""` → terminal default colors (OSC 10/11/4 hoặc guess)
- [ ] **Appearance detection**: dark/light từ theme colors hoặc terminal report
- [ ] `style()`, `fg()`, `bg()`, `bold()`, `italic()`, `underline()`, `inverse()`, `strikethrough()`
- [ ] `getThinkingBorderColor(level)`, `getBashModeBorderColor()`

### 3.3 System Theme (`src/tui/ink/theme/system-theme.ts` → new)
- [ ] Generate từ terminal reported colors (foreground/background + palette 0-15)
- [ ] **Grayscale fallback** khi terminal colors pending (saturation = 0)
- [ ] **Auto light/dark**: `lightTheme/darkTheme` setting, theo dõi terminal color scheme report
- [ ] OKLCH color space cho mixing, contrast

### 3.4 Theme Loading (`src/tui/ink/theme/theme.ts` → enhance) ✅ **HOÀN THÀNH**
- [x] Built-in themes: `dark.json`, `light.json` từ package
- [x] Custom themes: `~/.pi/themes/*.json` + hot reload via fs.watch
- [x] **JSON Schema validation** (optional, lazy-loaded typebox) - theme-schema.ts
- [x] Variable references trong theme JSON (`vars` map)
- [x] Theme registry: registered themes (extension-provided) + file themes
- [x] `initTheme()`, `setTheme()`, `setThemeInstance()`, `onThemeChange()`

### 3.5 Theme Controller (`src/tui/ink/theme/theme-controller.ts` → new) ✅ **HOÀN THÀNH**
- [x] OSC 10/11/4 query terminal colors
- [x] OSC 2031 light/dark scheme detection
- [x] Auto-switch light/dark theme khi terminal report thay đổi
- [x] Apply theme to TUI, notify components

### 3.6 TUI Helpers (`src/tui/ink/theme/theme.ts` → add) ✅ **HOÀN THÀNH**
- [x] `getMarkdownTheme()`: mapping tokens cho Markdown renderer
- [x] `getSelectListTheme()`, `getEditorTheme()`, `getSettingsListTheme()`
- [x] `highlightCode()`: highlight.js với theme-aware tokens
- [x] `CodeHighlighter` class: cache per-owner (code + lang + theme + grammar count)
- [x] `getLanguageFromPath()`: extension → language mapping
- [x] HTML export: CSS custom properties từ theme

---

## 📋 PHASE 4: INTERACTIVE MODE COMPONENTS

### 4.1 Chat Viewport (`src/modes/interactive/chat-viewport.ts` → new)
- [ ] `ScrollView` transcript với `follow: "end"`, `overscroll: "chain"`
- [ ] Fixed dock: pendingMessages + status + widgetsAbove + editor + widgetsBelow + footer
- [ ] Flexbox layout: transcript grow=1, dock basis=auto

### 4.2 Header (`src/tui/ink/components/Header.tsx` → rewrite)
- [ ] **BuiltInHeader**: Logo (piLogoLines) + version + key hints (compact/expanded toggle)
- [ ] Clickable logo → easter egg 3D (ArminComponent)
- [ ] Onboarding text: "Pi can explain its own features..."
- [ ] Collapse/expand state persisted
- [ ] Custom header từ extension (fallback built-in)

### 4.3 Footer (`src/tui/ink/components/Footer.tsx` → rewrite hoàn toàn)
- [ ] **Line 1**: PWD (~shortened) + git branch + session name
- [ ] **Line 2**: Token stats: `↑input ↓output R<cacheRead> W<cacheWrite> CH<cacheHitRate>% $<cost> <context%>/<contextWindow> (auto)` + xp badge
- [ ] **Right side**: Model name + thinking level + routed model (`→ provider/id • level`)
- [ ] Provider prefix khi multiple providers
- [ ] Extension statuses (sorted alphabetically, single line, truncated)
- [ ] Color-coded context%: >90 error, >70 warning
- [ ] Subscription indicator cho Kimi/Anthropic

### 4.4 Model Selector (`src/tui/ink/components/ModelSelector.tsx` → rewrite)
- [ ] Search input + fuzzy filter (model name + provider + "default" badge)
- [ ] **Scoped models toggle** (Tab): all / scoped
- [ ] **Select as default** (Ctrl+S) → save to settings
- [ ] **Async catalog refresh**: "Refreshing..." → success/error, non-blocking
- [ ] Current model highlighted ✓, default model badge
- [ ] Scroll indicator, model name display khi selected

### 4.5 Session Selector (`src/tui/ink/components/SessionSelector.tsx` → rewrite)
- [ ] **Threaded tree view**: parentSessionPath → hierarchy, sort by latest activity
- [ ] **Flat modes**: recent / relevance (fuzzy) / threaded
- [ ] **Named filter** (Ctrl+N): all / named only
- [ ] **Path toggle** (Ctrl+P): show full path
- [ ] **Rename** (Ctrl+R): input dialog
- [ ] **Delete** (Ctrl+D): confirmation → `trash` CLI fallback `unlink`
- [ ] **Scope toggle** (Tab): current folder / all folders
- [ ] Lazy load: current scope first, all scope on-demand
- [ ] Progress indicator khi loading

### 4.6 Settings Selector (`src/tui/ink/components/SettingsSelector.tsx` → rewrite)
- [ ] **40+ settings** organized in SettingsList với search
- [ ] **Submenus**:
  - Theme: single / automatic (light/dark) với live preview
  - Model thinking overrides: per-model thinking level (SteppedSubmenu)
  - Warnings: individual toggles
- [ ] Settings categories:
  - Auto-compact, steering/follow-up mode, transport, share destination
  - HTTP idle timeout, cache warming mode, hide thinking, mermaid rendering
  - Cache miss notices, collapse changelog, quiet startup, install telemetry
  - Default project trust, double-escape action, tree filter mode
  - Show hardware cursor, editor padding, output padding, autocomplete max visible
  - Clear on shrink, terminal progress, TUI mode, fullscreen options
  - Images: show/auto-resize/block/width
  - Skill commands

### 4.7 Theme Selector (`src/tui/ink/components/ThemeSelector.tsx` → rewrite)
- [ ] System theme first, then automatic mode, then built-in/custom
- [ ] **Automatic mode**: light/dark theme pair, terminal appearance detection
- [ ] Live preview khi navigate (theme preview callback)
- [ ] Custom themes từ `~/.pi/themes/`

### 4.8 Tree Selector (`src/tui/ink/components/TreeSelector.tsx` → new)
- [ ] `/tree` command: session tree navigation
- [ ] **Filters**: default / no-tools / user-only / labeled-only / all
- [ ] Branch visualization với continuation lines (│ ├ └)
- [ ] Labels, timestamps, message counts

### 4.9 Login/Logout (`src/tui/ink/components/LoginDialog.tsx` + `OAuthSelector.tsx` → rewrite)
- [ ] OAuth device code flow với polling
- [ ] API key input (masked)
- [ ] Provider autocomplete (search providers)
- [ ] Radius integration (pi's managed auth)
- [ ] Subscription warning cho Anthropic

### 4.10 Thinking Selector (`src/tui/ink/components/ThinkingSelector.tsx` → new)
- [ ] Cycle thinking levels với descriptions
- [ ] Per-model overrides link

### 4.11 Scoped Models Selector (`src/tui/ink/components/ScopedModelsSelector.tsx` → new)
- [ ] `/scoped-models`: per-session model scoping

### 4.12 Trust Selector (`src/tui/ink/components/TrustSelector.tsx` → new)
- [ ] `/trust`: project trust decisions

### 4.13 User Message Selector (`src/tui/ink/components/UserMessageSelector.tsx` → new)
- [ ] `/fork` từ user message cụ thể

### 4.14 Message Components (`src/tui/ink/components/` → new files)
- [ ] **UserMessageComponent**: OSC133 prompt markers, padding, timestamp
- [ ] **AssistantMessageComponent**: Streaming text + thinking blocks + tool calls
- [ ] **ToolExecutionComponent**: Tool name + args (collapsed/expanded Ctrl+T) + output + duration + error state
- [ ] **BashExecutionComponent**: Live ANSI output, expandable, exit code
- [ ] **BranchSummaryMessageComponent**: Branch summary với file operations
- [ ] **CompactionSummaryMessageComponent**: Compaction summary + cost
- [ ] **CustomMessageComponent**: Custom session entries
- [ ] **CustomEntryComponent**: Generic custom entry
- [ ] **SkillInvocationMessageComponent**: Skill invocation display
- [ ] **VisualTruncate**: Expandable text với line preview cache

### 4.15 Status Indicators (`src/tui/ink/components/StatusIndicator.tsx` → new)
- [ ] **WorkingStatusIndicator**: Spinner + message, embed trong editor border
- [ ] **CompactionStatusIndicator**: Progress + cost + Esc abort
- [ ] **RetryStatusIndicator**: Countdown + attempt number + Esc abort
- [ ] **BranchSummaryStatusIndicator**: Branch summary indicator
- [ ] **IdleStatus**: Ready state

### 4.16 Dynamic Border (`src/tui/ink/components/DynamicBorder.tsx` → new)
- [ ] Border color theo trạng thái: working (accent), bash (bashMode), compaction (warning), retry (error)

### 4.17 Keybinding Hints (`src/tui/ink/components/KeybindingHints.tsx` → new)
- [ ] Dynamic key hints từ keybindings config
- [ ] `keyHint()`, `keyText()`, `keyDisplayText()`, `rawKeyHint()`

### 4.18 Markdown Transform (`src/tui/ink/components/MarkdownTransform.tsx` → enhance)
- [ ] **Tables**: GFM table rendering với borders (┌─┬─┐)
- [ ] **LaTeX**: Inline `$...$` + block `$$...$$` (port Latex.ts 2D layout)
- [ ] **Syntax highlighting**: code blocks với highlight.js + theme tokens
- [ ] **Strikethrough** nghiêm ngặt (~~text~~)
- [ ] **HTML comments** (`<!-- -->`)
- [ ] **Nested lists** với ordered/unordered markers giữ nguyên
- [ ] **Links**: giữ URL đích, không bỏ
- [ ] **Mermaid**: Streaming diagram rendering

### 4.19 Mermaid (`src/tui/ink/components/Mermaid.tsx` → new)
- [ ] Mermaid.js integration
- [ ] Unicode diagram rendering
- [ ] Theme-aware colors

### 4.20 External Editor (`src/tui/ink/core/ExternalEditor.ts` → new)
- [ ] `editInExternalEditor(content, extension?)`: viết temp file, spawn $EDITOR, đọc lại
- [ ] Paste markers expanded trước khi mở
- [ ] Non-blocking, callback khi done

### 4.21 Clipboard (`src/utils/clipboard.ts` → enhance)
- [ ] **Cross-platform**: macOS (pbcopy/pbpaste), Linux (wl-copy/wl-paste, xclip, xsel), Windows (powershell/clip)
- [ ] **Files**: read clipboard file paths (drag-drop)
- [ ] **Images**: read clipboard image → base64/png
- [ ] **Text**: read/write text
- [ ] **Bash mode quote**: `!` prefix paths cần quote

### 4.22 Program Status Reporter (`src/modes/interactive/ProgramStatusReporter.ts` → new)
- [ ] OSC 7501: working/blocked/done/error + session name
- [ ] Auto-report khi terminal support confirmed

---

## 📋 PHASE 5: INTERACTIVE MODE LOGIC (`src/modes/interactive/interactive-mode.ts` → rewrite)

### 5.1 Initialization & Lifecycle
- [ ] `InteractiveModeOptions` đầy đủ (migratedProviders, startupDiagnostics, modelFallbackMessage, autoTrustOnReloadCwd, initialMessage/Images/Messages, verbose, tuiMode, initialThemeSetting, terminal)
- [ ] Signal handlers: SIGINT (Ctrl+C), SIGTERM, SIGTSTP (Ctrl+Z), SIGCONT
- [ ] Crash log capture + extension stack frame detection
- [ ] Version check async, package update check, tmux keyboard setup check
- [ ] PNG transcoder ensure (image processing)

### 5.2 Key Handlers (`setupKeyHandlers`)
- [ ] **Ctrl+C**: lần 1 clear editor, lần 2 trong 500ms → shutdown
- [ ] **Ctrl+D**: exit khi editor rỗng, khác ignore
- [ ] **Ctrl+Z**: suspend (stop terminal, SIGTSTP), SIGCONT resume
- [ ] **Esc**: abort streaming / exit bash mode / double-escape → fork/tree
- [ ] **Ctrl+G**: external editor
- [ ] **Ctrl+V**: clipboard paste (files/images/text)
- [ ] **Ctrl+P/N**: cycle model forward/backward + toast
- [ ] **Ctrl+Shift+P/N**: cycle thinking level
- [ ] **Ctrl+Shift+T**: toggle thinking block
- [ ] **Ctrl+Shift+F**: transcript search (fullscreen)
- [ ] **Ctrl+O**: dequeue queued messages
- [ ] **Ctrl+Y**: copy last assistant message
- [ ] **Ctrl+T**: toggle tool output expansion
- [ ] **Shift+Enter** (streaming): queue steering message
- [ ] **Alt+Enter** / **Ctrl+J**: queue follow-up message
- [ ] **Ctrl+K**: command palette (/) → slash command autocomplete

### 5.3 Editor Submit Handler (`setupEditorSubmitHandler`)
- [ ] **Slash commands** (`/cmd args`): route to `runCommand()` KHÔNG gửi LLM
- [ ] **Bash mode** (`!cmd` / `!!cmd`): execute bash, live output component
- [ ] **Regular prompt**: `session.prompt()` cho LLM
- [ ] **Empty submit**: Ctrl+D behavior

### 5.4 Slash Commands (`runCommand` → implement all)
- [ ] `/quit` / `/exit`: graceful shutdown
- [ ] `/help`: help overlay
- [ ] `/model [provider/id]`: open ModelSelector hoặc switch trực tiếp
- [ ] `/thinking [level]`: open ThinkingSelector hoặc cycle
- [ ] `/login [provider]`: LoginDialog / OAuth
- [ ] `/logout`: clear auth
- [ ] `/settings`: SettingsSelector
- [ ] `/theme [name]`: ThemeSelector / switch
- [ ] `/tools`: toggle built-in tools
- [ ] `/compact`: manual compaction
- [ ] `/sessions`: SessionSelector
- [ ] `/session <id>`: switch session
- [ ] `/new`: new session
- [ ] `/resume`: SessionSelector (alias)
- [ ] `/fork [message-id]`: UserMessageSelector / fork
- [ ] `/tree [filter]`: TreeSelector
- [ ] `/trust`: TrustSelector
- [ ] `/name <name>`: rename session
- [ ] `/hotkeys`: Keybindings overlay
- [ ] `/changelog`: full changelog markdown
- [ ] `/debug`: diagnostics overlay
- [ ] `/export` / `/import`: session export/import
- [ ] `/share`: upload to Gist/Radius
- [ ] `/clone`: clone shared session
- [ ] `/bug`: bug report với crash log
- [ ] `/copy`: copy last assistant message
- [ ] `/scoped-models`: ScopedModelsSelector
- [ ] `/reload`: reload resources
- [ ] Extension commands: delegate to ExtensionRunner

### 5.5 Streaming & Event Handling (`subscribeToAgent`)
- [ ] **message_start**: tạo AssistantMessageComponent streaming
- [ ] **message_update**: append text/thinking delta, update component
- [ ] **message_end**: finalize, extract thinking blocks, add to transcript
- [ ] **tool_execution_start**: tạo ToolExecutionComponent/BashExecutionComponent
- [ ] **tool_execution_update**: append output chunk (live)
- [ ] **tool_execution_end**: finalize, duration, error state
- [ ] **agent_start/end**: working status indicator
- [ ] **queue_update**: steering/follow-up queue display
- [ ] **compaction_start/end**: CompactionStatusIndicator
- [ ] **auto_retry_start/end**: RetryStatusIndicator
- [ ] **error**: toast error

### 5.6 Message Queue (Steering + Follow-up)
- [ ] `getQueue()`: steering + follow-up messages
- [ ] `queueFollowUp(text)`: add to follow-up queue
- [ ] `restoreQueue()`: restore all queued to editor
- [ ] `clearQueue()`: clear both queues
- [ ] `hasQueuedMessages()`: boolean
- [ ] Dock display: queue count + hint (Alt+O to edit)

### 5.7 Transcript Management
- [ ] `renderInitialMessages()`: load session entries → transcript components
- [ ] `loadTranscript()`: rebuild transcript sau session switch/fork/tree/compaction
- [ ] Thinking blocks: attach to assistant message, toggle visibility
- [ ] Tool execution: separate component trong transcript (không gộp vào text)

### 5.8 Session Operations
- [ ] `switchSession()`: resubscribe runtime + load transcript
- [ ] `newSession()`: create new, load empty transcript
- [ ] `forkSession()`: fork from message, load transcript
- [ ] `navigateTree()`: tree navigation, load transcript

### 5.9 Extension UI Integration
- [ ] `provideExtensionUIContext()`: dialogs (select/confirm/input/editor/inline), overlays, widgets
- [ ] `pushExtensionDialog()`: stack dialogs, blocked status
- [ ] `pushExtensionOverlay()`: custom overlays
- [ ] `pushExtensionWidget()`: above/below editor
- [ ] Custom header/footer từ extension

### 5.10 Shutdown
- [ ] Graceful: stop terminal, dispose runtime, kill tracked children, save session
- [ ] Crash: record crash log, notify user

---

## 📋 PHASE 6: ADVANCED FEATURES

### 6.1 Fullscreen Alt-Screen (`src/tui/ink/core/TuiAltScreen.tsx` → new)
- [ ] Alternate screen buffer (ESC [?1049h/l)
- [ ] **Mouse text selection**: click-drag, copy on select (configurable)
- [ ] **Scrollbar**: drag, click, wheel
- [ ] **Search** (Ctrl+Shift+F): regex/fuzzy, highlight matches, next/prev (n/N)
- [ ] **OSC 133 prompt navigation**: jump between prompts
- [ ] **Wheel scroll**: configurable lines, auto-accelerate

### 6.2 Transcript Search (`src/tui/ink/components/AltScreenSearch.tsx` → enhance)
- [ ] Fullscreen search overlay
- [ ] Corpus: tất cả transcript lines
- [ ] Navigation: n/N, Enter jump, Esc close
- [ ] Match highlighting

### 6.3 Image Support
- [ ] **Kitty image protocol**: upload, placement, cell dimensions query
- [ ] **iTerm2 inline images**: escape sequences
- [ ] **Sixel**: fallback
- [ ] **Auto-resize**: max 2000x2000 cho model compatibility
- [ ] **Block images**: setting để không gửi LLM
- [ ] **Show images**: toggle inline render

### 6.4 Cache Warming Notices
- [ ] Cache miss notices: cost, provider recovery diagnostics
- [ ] Idle warming status: "Warming cache... profitable/tracking"
- [ ] Footer integration

### 6.5 Session Share / Export / Import
- [ ] `/share`: GitHub Gist (anonymous) hoặc Radius (authenticated)
- [ ] `/clone`: clone từ shared URL
- [ ] `/export`: HTML (ANSI→HTML) + JSONL
- [ ] `/import`: import JSONL session file

### 6.6 Bug Report
- [ ] `/bug`: collect crash log, session info, system info
- [ ] Upload to endpoint, return URL

### 6.7 Changelog
- [ ] `/changelog`: parse CHANGELOG.md, new entries since last version
- [ ] Extension changelog updates
- [ ] Collapse option (condensed)

### 6.8 Model Catalog Refresh
- [ ] Background refresh model catalogs từ providers
- [ ] Progress indicator, error handling per provider
- [ ] ModelSelector async refresh

### 6.9 Resource Loader Integration
- [ ] Skills, extensions, prompt templates, themes, context files (AGENTS.md, CLAUDE.md)
- [ ] Loaded resources listing in header (grouped by scope)

### 6.10 Trust Manager
- [ ] Project trust decisions (ask/always/never)
- [ ] Trust file persistence
- [ ] Extension trust hooks

---

## 📋 PHASE 7: SETTINGS & CONFIGURATION

### 7.1 Settings Manager Enhancements
- [ ] **40+ settings** với validation (AJV schema)
- [ ] Global + project deep merge
- [ ] File locking (PID-based stale detection)
- [ ] Modified tracking (chỉ ghi field thay đổi)
- [ ] InMemory storage cho test
- [ ] Migration: queueMode → steeringMode, websockets → transport

### 7.2 Keybindings
- [ ] Default keybindings (30+ actions)
- [ ] User override file (`~/.pi/keybindings.json`)
- [ ] Conflict detection UI
- [ ] App keybindings vs TUI keybindings separation

### 7.3 CLI Args
- [ ] `--mode regular|fullscreen|http|rpc`
- [ ] `--model`, `--provider`, `--api-key`, `--thinking`
- [ ] `--session`, `--fork`, `--resume`, `--continue`, `--no-session`
- [ ] `--tools`, `--no-tools`, `--no-builtin-tools`
- [ ] `--theme`, `--verbose`, `--offline`, `--list-models`
- [ ] Extension flags passthrough

---

## 📋 PHASE 8: AGENT CORE INTEGRATION

### 8.1 Session Persistence
- [ ] JSONL v3 format: session, message, thinking_level_change, model_change, compaction, branch_summary, label, custom, custom_message
- [ ] Tree structure: parentId, leaf, index
- [ ] `buildSessionContext`: reconstruct từ leaf, compaction summary + remaining messages
- [ ] Compaction: safe cut point (không cắt giữa tool call/result), LLM summarization
- [ ] Branch summarization: file operations tracking

### 8.2 Agent Loop
- [ ] ReAct loop với context builder, token estimation
- [ ] Tool executor: parallel/sequential, timeout, retry, cache
- [ ] Loop strategies: ReAct, PlanSolve, Reflection, Simple, SelfRefine
- [ ] Memory guards: MAX_TOOL_TURNS=1000, MAX_TOOL_RESULTS=1000
- [ ] Streaming: proxy stream, event stream

### 8.3 LLM Layer
- [ ] OpenAI-compatible provider (30+ providers via compat matrix)
- [ ] Model registry: generated models.ts (4700 lines, auto-generated)
- [ ] Compat detection: 15 flags per provider
- [ ] Transform messages: vision fallback, tool-call ID normalize, thinking blocks
- [ ] Overflow handling: token estimation + truncation

### 8.4 Memory Engine (Integration)
- [ ] MemoryStore: JSON + gzip, dedup by hash, LRU eviction
- [ ] MemoryScorer: BM25 + heuristic (keyword, filepath, action, recency, access_count)
- [ ] MemoryRetriever: prefilter + cache 5min + metrics
- [ ] MemoryEngine: add/recall/project switching/context string
- [ ] **Integration**: hook vào AgentLoop (memoryBoosting), event memory:retrieve

### 8.5 Extensions
- [ ] Extension API: sendMessage, registerTool, setActiveTools, showDialog, getConfig, registerKeybinding
- [ ] Extension events: session lifecycle, tool calls, agent events
- [ ] Extension loader: ESM import, discover from packages + directories
- [ ] Extension runner: sequential handlers, error isolation, command/tool/flag registration

---

## 📋 PHASE 9: TESTING & QUALITY

### 9.1 Test Coverage
- [ ] Unit tests cho tất cả core components (Keys, Terminal, Editor, Layout, Theme)
- [ ] Integration tests: interactive-mode full flow với mock LLM
- [ ] Visual regression tests: ink-testing-library cho components
- [ ] Keyboard protocol tests: legacy + Kitty + modifyOtherKeys sequences
- [ ] Theme tests: token resolution, system theme, auto light/dark
- [ ] Session tests: branching, compaction, import/export
- [ ] E2E tests: TUI smoke test, slash commands, selectors

### 9.2 CI/CD
- [ ] Build matrix: Linux/macOS/Windows (GitHub Actions)
- [ ] Typecheck: `tsc --noEmit` strict
- [ ] Lint: biome/prettier
- [ ] Test gate: coverage ≥80% (core modules ≥90%)
- [ ] Release automation: version bump, changelog, npm publish

### 9.3 Performance
- [ ] Startup time < 2s (cold), < 500ms (warm)
- [ ] Transcript render: 10k messages virtual scroll 60fps
- [ ] Memory: no leaks in long sessions (1000+ turns)
- [ ] Bundle size: minimal dependencies

---

## 📋 PHASE 10: DOCUMENTATION & ONBOARDING

### 10.1 User Docs
- [ ] Getting started guide
- [ ] Keybindings reference
- [ ] Slash commands reference
- [ ] Configuration guide (settings, themes, keybindings)
- [ ] Extension development guide
- [ ] MCP integration guide

### 10.2 Developer Docs
- [ ] Architecture overview (ARCH.md)
- [ ] Contributing guide
- [ ] Plugin/extension API docs
- [ ] Theme development guide

---

## 🎯 **DEFINITION OF DONE (Project Level)**

- [ ] `npm run build` pass (tsc + copy-assets + chmod)
- [ ] `npm test` pass (0 new failures, pre-existing documented)
- [ ] TUI boots in regular + fullscreen mode
- [ ] All slash commands functional
- [ ] All selectors open, navigate, select, cancel
- [ ] Streaming works: text, thinking, tool execution, bash live output
- [ ] Model cycling (Ctrl+P/N), thinking cycling (Ctrl+Shift+P/N)
- [ ] Theme system: system theme auto-detect, custom themes, auto light/dark
- [ ] Session persistence: resume, fork, tree, compaction, import/export
- [ ] Keyboard protocol: Kitty CSI-u, modifyOtherKeys, legacy sequences all work
- [ ] Mouse: click, drag, wheel, selection in fullscreen
- [ ] External editor (Ctrl+G), clipboard paste (Ctrl+V files/images/text)
- [ ] Footer: full stats, git branch, session name, routed model
- [ ] Header: logo, version, key hints, onboarding
- [ ] Extensions: load, register tools/commands, UI dialogs

---

## 📝 **NOTES**

> **Không copy code từ pi-mono.** Mọi file trên phải viết từ đầu, tham khảo:
> - API signatures (interface, types)
> - Hành vi UX (keybindings, flow, states)
> - Kiến trúc (phân lớp, data flow)
> - Edge cases đã xử lý (xem comments trong code pi-mono)
>
> **Kiến trúc picro:** Ink + React (VDOM) thay vì string-render của pi-mono.
> - Component render trả về JSX, không phải `string[]`
> - State quản lý bằng `useState`/`useRef` thay vì mutable class fields
> - Layout dùng Ink Flex/Box, không phải custom flexbox
> - Nhưng logic nghiệp vụ (editor state machine, keyboard matching, theme tokens) phải ngang ngửa pi-mono
>
> **Ưu tiên thực hiện:** Phase 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
> Mỗi phase phải `build` + `test` pass trước khi sang phase tiếp.