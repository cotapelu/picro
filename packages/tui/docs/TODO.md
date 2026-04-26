# TUI Rewrite — Full Implementation Plan

**Status:** In Progress  
**Goal:** Rewrite `@picro/tui` from scratch to achieve full feature parity with `pi-tui-legacy` without copying code.  
**Constraints:** 
- Must mimic legacy APIs and behavior
- Must NOT copy any code (copyright clean)
- Must maintain existing minimal public API for coding agent (14 exports)
- All existing 143 tests must pass

---

## 📊 Current State vs Target

### ✅ Already Implemented (New TUI Minimal)
- Core types: `UIElement`, `RenderContext`, `InteractiveElement`, `KeyEvent`
- `TerminalUI` + `ElementContainer`
- `ProcessTerminal`
- Components: `Text`, `Markdown` (with syntax highlighting), `SelectList`, `SettingsList`, `BorderedLoader`
- Utilities: `visibleWidth`, `wrapText`, `truncateText`, `fuzzyFilter`, etc.
- Key parsing: `parseKey`, `matchesKey`, `isKeyRelease`
- Keybindings: `KeybindingsManager`, `getKeybindings`
- Basic layout: `Box`, `Spacer`, `Divider`, `DynamicBorder`

**Total:** ~12 files, ~3,000 LOC, 14 public exports

### ❌ Missing (Compared to Legacy)

#### Critical Infrastructure (Phase 1)
1. ~~Panel margin support (`margin` option)~~
2. ~~Panel `maxHeight` (scrollable panels)~~
3. Input listener chain (`addInputListener`/`removeInputListener`)
4. Terminal image protocols (Kitty/iTerm2)
5. Differential rendering (line diffing, viewport preservation)
6. Segment reset after each line (ANSI bleed prevention)
7. Synchronized output (`\x1b[?2026`)
8. Debug redraw logging (`PI_DEBUG_REDRAW`)
9. Append/delete optimizations

#### Advanced Features (Phase 2)
10. Autocomplete system (file paths, slash commands)
11. Full editor component (kill-ring, undo-stack, multi-line)
12. CancellableLoader
13. ProgressBar, Stepper, Toast, Modal
14. Badge, Rating
15. CommandPalette
16. ContextMenu
17. FileBrowser
18. Breadcrumbs
19. Diff viewer
20. ModelSelector
21. Theme system (dynamic, file watcher)
22. Enhanced utilities (tab expansion, east-asian-width)
23. Terminal enhancements (cell dimension query, etc.)

**Total missing:** ~23 major features, est. 3,500-4,500 LOC

---

## 🗓️ Implementation Plan (Sprints)

### Sprint 1: Core Rendering Parity (2-3 weeks)
**Goal:** Overlay/panel system matches legacy capabilities.

**Todos:**
1. ~~Panel margin support~~ (P1)
2. ~~Panel maxHeight + scroll handling~~ (P1)
3. Input listener chain (P1)
4. Differential rendering (viewport-aware) (P1)
5. Segment reset per line (P1)
6. Synchronized output (P1)
7. Debug logging (P1)
8. Append/delete optimizations (P2)
9. Viewport tracking improvements (P2)

**Deliverable:** Rendering engine with full overlay capabilities, better performance.

---

### Sprint 2: Terminal Images & Autocomplete (2 weeks)
**Goal:** Rich terminal capabilities.

**Todos:**
10. Terminal image protocol support (new `terminal-image.ts`) (P3)
11. Cell dimension query (`CSI 16 t`) (P3)
12. Autocomplete infrastructure (new `autocomplete.ts`) (P4)
13. Integrate images into Text/Markdown (optional)

**Deliverable:** Images display, file path completion.

---

### Sprint 3: Editor & Input Enhancements (2 weeks)
**Goal:** Full editing capabilities.

**Todos:**
14. Editor component (new `editor.ts`) with undo/redo, kill-ring (P5)
15. Enhance `Input` component (navigation, history) (P5)
16. Tab expansion in `visibleWidth` (P5)
17. Kill-ring parity check (P5)
18. Undo-stack enhancements (P5)

**Deliverable:** Multi-line editor ready for coding agent.

---

### Sprint 4: UI Component Library (2-3 weeks)
**Goal:** Complete set of reusable components.

**Todos:**
19. CancellableLoader (P6)
20. ProgressBar + Stepper (P6)
21. Toast + Modal (P6)
22. Badge + Rating (P6)
23. CommandPalette (P6)
24. ContextMenu (P7)
25. FileBrowser (P7)
26. Breadcrumbs (P7)
27. Diff viewer (P7)
28. ModelSelector (P7)
29. Theme system (P7)

**Deliverable:** Full generic component library.

---

### Sprint 4.5: Application Components (2 weeks)
**Goal:** Implement all application-specific components from `interactive/components/` that the coding agent needs. These are not generic library components but are required for the coding agent to function.

**Approach:** 
- Study each legacy component to understand its API and behavior
- **Rewrite from scratch** using existing primitives (Text, SelectList, etc.)
- **Do NOT import from `pi-tui-legacy/`** — implement fresh
- Add to `src/components/` and export via `index.ts`

**Todos:**

#### 4.5.1 Message Components
**Files:** `src/components/messages/user-message.ts`, `assistant-message.ts`, `tool-message.ts`, `custom-message.ts`
- `UserMessage`: Right-aligned bubble with avatar/color
- `AssistantMessage`: Left-aligned, supports Markdown, loading state
- `ToolExecutionMessage`: Shows tool name, input/output, expandable
- `BashExecutionMessage`: Command output with syntax highlighting
- Use `Markdown`, `Text` internally
**Test:** Render each type, correct appearance.

---

#### 4.5.2 Footer Component
**File:** `src/components/footer.ts` (enhance existing)
- Shows: cwd (with git branch), token stats (↑↓R/W), cost, context % (colored), current model (provider), auto-compact indicator, extension statuses
- Format numbers: `<1000` raw, `1.2k`, `1M`
- Truncate if too wide
- `setSession(session)` to update stats
- `setAutoCompactEnabled(bool)`
**Test:** Footer displays correct mock session data.

---

#### 4.5.3 Selector Components Suite
**Files:** New in `src/components/selectors/` directory:
- `model-selector.ts`: LLM models list (provider, ctx window, cost), search/filter
- `session-selector.ts`: Session list with cwd, time, search
- `settings-selector.ts`: Settings UI (toggles, inputs, dropdowns)
- `theme-selector.ts`: Theme list with preview
- `oauth-selector.ts`: OAuth provider buttons, login flow
- `extension-selector.ts`: Installed extensions enable/disable
- `scoped-models-selector.ts`: Models filtered by scope
- `config-selector.ts`: Edit config values (text/number/bool/enum)
- `tree-selector.ts`: Hierarchical tree navigation

All built on `SelectList` with custom item rendering and optional search input.
**Test:** Each selector displays data, selection works, search filters.

---

#### 4.5.4 Dialogs
**Files:** `src/components/dialogs/login-dialog.ts`, `confirm-dialog.ts`, `alert-dialog.ts` (or integrate into `modal.ts`)
- `LoginDialog`: username/password, OAuth buttons, errors
- `confirmDialog(message): Promise<boolean>`
- `alertDialog(message): void`
- Centered modal, blocks background, ESC handled
**Test:** Dialog opens, buttons work, returns correct result.

---

#### 4.5.5 Special Components
**Files:**
- `src/components/keybinding-hints.ts`: Render keybinding hints (e.g., "Ctrl+S Save")
- `src/components/countdown-timer.ts`: Countdown display (1s updates)
- `src/components/extension-input.ts`: Input for extension-defined values
- `src/components/skill-invocation-message.ts`: Skill being invoked indicator
- `src/components/branch-summary-message.ts`: Git branch change notification
- `src/components/compaction-summary-message.ts`: Context compaction summary
- Optional Easter eggs: `earendil-announcement.ts`, `armin.ts`, `daxnuts.ts`

Most are simple `Text` or `Container` compositions.
**Test:** Render each, verify content.

---

#### 4.5.6 Theme Manager
**File:** `src/components/themes.ts` (complete implementation)
- `Theme` interface with semantic color roles
- Presets: `darkTheme`, `lightTheme`, `highContrastTheme`
- `ThemeManager` singleton: `setTheme()`, `getTheme()`, `onChange(listener)`
- Load from `~/.config/picro/tui/theme.json` with file watcher
- Helpers: `theme.fg(role, text)`, `theme.bg(role, text)`
- Components subscribe and invalidate on change
**Test:** Change theme file, components update automatically.

---

#### 4.5.7 Enhanced BorderedLoader
**File:** `src/components/loader.ts` (add `CancellableLoader`)
- Extends `BorderedLoader`
- `AbortController`, `onAbort`, `signal`, `aborted`
- Handles Escape key to abort
**Test:** Loader cancels on Escape, signal.aborted true.

---

**Deliverable:** Complete set of application components needed by coding agent, fully integrated with generic TUI library.

---

### Sprint 5: Polish & Testing (1 week)
**Goal:** Production quality.

**Todos:**
30. Enhance fuzzy matching (add `fuzzyHighlight`)
31. Complete keybindings (isKeyRepeat, Kitty protocol functions)
32. Terminal I/O robustness (cell size caching, clearScreen)
33. Utilities enhancements (`truncateToWidth`, east-asian-width)
34. Write comprehensive tests for all new features (target: 80%+ coverage)
35. Update documentation (API reference, examples)
36. Performance profiling & optimization
37. Memory leak checks

**Deliverable:** Production-ready TUI library.

---

## 📋 Detailed Todo Items

### P1: Panel Overlay Enhancements (Critical)

#### 1.1 Panel Margin Support
**File:** `base.ts` (modify PanelOptions), `tui.ts` (calculatePanelPosition)
**Why:** Legacy overlays support `margin` (uniform number or per-side object). New panels lack this.
**What:**
- Add `PanelMargin` interface: `{ top?, right?, bottom?, left? }`
- Extend `PanelOptions`: `margin?: number | PanelMargin`
- In `calculatePanelPosition()`, apply margin based on anchor:
  - For anchor-based positioning: add margin to computed startRow/startCol
  - For absolute row/col: margin ignored (per legacy)
**Test:** Panel with `margin: 2` centers with 2-cell padding.

---

#### 1.2 Panel MaxHeight + Scrolling
**File:** `base.ts` (add to PanelOptions), `tui.ts` (renderPanels)
**Why:** Legacy has `maxHeight` to create scrollable panels. New lacks this.
**What:**
- Add `maxHeight?: number | \`\${number}%\`` to `PanelOptions`
- In `renderPanels()`:
  - Compute desired height from content (component.draw())
  - If height > maxHeight, truncate to maxHeight lines
  - Need scroll offset? Legacy: overlays handle their own scrolling (components track internal scroll)
  - **Approach:** Let component handle scrolling via `RenderContext.height`? Or add `scrollOffset` to options?
  - Follow legacy: overlay passes limited height to component.draw(), component truncates internally.
**Test:** Panel with many lines, maxHeight=5, only first 5 lines show.

---

#### 1.3 Input Listener Chain
**File:** `tui.ts`
**Why:** Legacy allows multiple listeners that can modify/consume input before it reaches key handlers.
**What:**
```typescript
type InputListener = (data: string) => { consume?: boolean; data?: string } | undefined;
private inputListeners = new Set<InputListener>();
addInputListener(listener: InputListener): () => void { /* ... */ }
removeInputListener(listener: InputListener): void { /* ... */ }
// In handleKey before keyEvent parsing:
let processed = data;
for (const listener of this.inputListeners) {
  const result = listener(processed);
  if (result?.consume) return;
  if (result?.data !== undefined) processed = result.data;
}
// use processed
```
**Test:** Listener that remaps 'a' to 'b', verify component receives 'b'.

---

#### 1.4 Differential Rendering (Line Diffing)
**File:** `tui.ts` (major refactor of `renderInternal()` and `fullRedraw()`)
**Why:** Legacy only redraws changed lines; new always redraws everything.
**What:**
- Compute `previousLines` (already stored)
- After `newLines` computed, find first index where they differ
- Find last index where they differ
- If prefix unchanged and newLines longer → append-only
- If prefix unchanged and newLines shorter → delete-only
- Else → redraw from firstChanged to end
- Use `terminal.moveBy()` to position cursor efficiently
- Update `previousLines` = newLines
**Test:** Render 10 lines, change line 5, verify only line 5 sent to terminal (mock terminal).

---

#### 1.5 Segment Reset & Synchronized Output
**File:** `tui.ts`
**Why:** Prevent ANSI color/attribute bleed between lines; atomic updates reduce flicker.
**What:**
- Before rendering, write `\x1b[?2026h` (start synchronized)
- After rendering all lines, write `\x1b[?2026l` (end synchronized)
- After each line in output, append `\x1b[0m\x1b]8;;\x07` (reset SGR + terminate OSC links)
- Option to disable via flag if needed
**Test:** Render multi-colored text, verify colors don't persist to next line.

---

#### 1.6 Debug Redraw Logging
**File:** `tui.ts`
**Why:** Legacy logs to file when `PI_DEBUG_REDRAW` env var set.
**What:**
- In constructor: check `process.env.PI_DEBUG_REDRAW`
- If set, open file append stream
- `private logRender(msg: string)`: append timestamp + message
- Log key events: render requested, scheduled, diff results, optimization path, timing
- Ensure async safe (use `fs.appendFileSync` for simplicity)
**Test:** Set env var, trigger renders, check log file contents.

---

#### 1.7 Append/Delete Optimizations
**File:** `tui.ts` (integrated with differential rendering)
**Why:** Legacy has fast paths for spinners/progress (append-only) and shrinking (delete-only).
**What:**
- Detect append-only: newLines.length > previousLines.length && prefix matches
- Detect delete-only: newLines.length < previousLines.length && prefix matches
- For append: move cursor to end, write only new lines
- For delete: clear remaining lines after new end
- Already covered by differential rendering but need explicit optimizations
**Test:** BorderedLoader tick → only append new spinner frame line.

---

#### 1.8 Viewport Tracking
**File:** `tui.ts`
**Why:** Legacy tracks scroll position to preserve viewport on resize.
**What:**
- Track `previousViewportTop` (which line was at top of viewport)
- On resize, if height changed, adjust content so viewport line stays visible
- Complex: involves `terminal.moveBy()` calculations
- May require storing which lines were visible in previous frame
**Test:** Long scrollable content, scroll down, resize terminal, verify scroll position maintained.

---

### P2: Terminal Images (Week 3)

#### 2.1 Terminal Image Protocol Support
**File:** New `terminal-image.ts` (500 lines)
**Why:** Legacy supports Kitty, iTerm2, Ghostty, WezTerm image display. New has nothing.
**What:**
- Detect protocols via env vars (`TERM`, `KITTY_WINDOW_ID`, etc.)
- `getCapabilities()`: `{ images: boolean, trueColor: boolean, hyperlinks: boolean, protocol: ImageProtocol }`
- `renderImage(buffer: ArrayBuffer, mime: string, options: ImageRenderOptions): string | null`
- `encodeKitty()`: Build `\x1b_G...` sequence
- `encodeITerm2()`: Build `\x1b]1337;...` sequence
- `getPngDimensions()`, `getJpegDimensions()`, `getGifDimensions()`, `getWebpDimensions()` — binary header parsing
- `getImageDimensions(buffer, mime)` — unified
- `allocateImageId()`, `deleteKittyImage(id)`, `deleteAllKittyImages()`
- `queryCellSize()`: Send `CSI 16 t`, parse response
- `isImageLine(line)`: detect image escape sequences
- `imageFallback(dim, text?)`: placeholder when images unavailable
**Test:** Render 16x16 PNG in Kitty, verify appears.

---

#### 2.2 Integrate Images into Text/Markdown
**File:** `text.ts`, `markdown.ts`
**What:** Add `image` option to Text: `new Text({image: {buffer, mime, width, height}})` or inline markdown `![](data:...)`
**Test:** Text with image renders escape sequence.

---

### P3: Autocomplete System (Week 4-5)

#### 3.1 Autocomplete Infrastructure
**File:** New `autocomplete.ts` (700 lines)
**Why:** Legacy provides file path and slash command completion. New lacks any autocomplete.
**What:**
- `AutocompleteItem` interface: `{ label, insertText?, kind?, detail?, icon? }`
- `AutocompleteProvider` interface: `complete(query, cursorPos, signal): Promise<AutocompleteItem[]>`
- `CombinedAutocompleteProvider`: merges multiple providers
- `SlashCommandAutocompleteProvider`: completes `/` commands (needs command registry)
- `FilePathAutocompleteProvider`: walks filesystem, respects `.gitignore`, uses `fd` or `find`
- `FuzzyAutocomplete`: fuzzy scoring + highlighting
- Handle `@` mentions, quoted paths
**Test:** Type `/` shows commands, `src/` shows files.

---

#### 3.2 Editor Component
**File:** New `editor.ts` (600 lines) or enhance existing `input.ts` to multi-line
**Depends on:** `kill-ring.ts`, `undo-stack.ts`, `keybindings.ts`
**What:**
- Multi-line editing with line wrapping
- Undo/redo via `UndoStack<EditorState>`
- Kill ring for yank/paste (Ctrl+K, Ctrl+Y, Alt+Y)
- Vim/Emacs modes (optional)
- Search (Ctrl+R incremental)
- Line numbers (optional)
- Indent/dedent (Tab/Shift+Tab)
- Navigation: Home/End, Ctrl+Home/End, PageUp/Down, word jumps (Ctrl+Left/Right)
**Test:** Edit multi-line text, undo/redo, kill/yank work.

---

### P4: Additional UI Components (Week 6-7)

#### 4.1 CancellableLoader
**File:** `loader.ts` (add class)
**What:** Extend `BorderedLoader` with `AbortSignal`, `onAbort` callback, handles Escape key.
**Test:** Loader cancels on Escape, signal.aborted true.

---

#### 4.2 ProgressBar & Stepper
**Files:** New `progress-bar.ts`, `stepper.ts`
**What:**
- `ProgressBar`: filled bar with percentage, optional label
- `Stepper`: [1] > [2] > [3] or ● ○ ○ with labels
**Test:** ProgressBar at 50% renders correctly; Stepper shows current step highlighted.

---

#### 4.3 Toast & Modal
**Files:** New `toast.ts`, `modal.ts`
**What:**
- `Toast`: notification with type (info/success/warning/error), auto-dismiss
- `ToastManager`: manages multiple toasts, positions (top/bottom)
- `Modal`: centered dialog with title, content, actions (OK/Cancel)
- `confirmDialog(message): Promise<boolean>`, `alertDialog(message): void`
**Test:** Toast appears and auto-dismisses; modal blocks interaction.

---

#### 4.4 Badge & Rating
**File:** New `badge.ts`, `rating.ts`
**What:**
- `Badge`: colored label (red/green/blue/yellow/gray)
- `BadgeGroup`: stack of badges
- `createBadge(text, color)`: factory
- `Rating`: star rating (0-5), interactive or read-only
- `createRating(value)`
**Test:** Badge renders with correct color; Rating shows correct stars.

---

#### 4.5 CommandPalette
**File:** `command-palette.ts` (may already exist but not in public API — verify)
**What:** CMD+Shift+P style palette with fuzzy search, keyboard navigation, grouping, recent items.
**Test:** Open palette, type filters list, Enter selects.

---

#### 4.6 ContextMenu
**File:** New `context-menu.ts`
**What:** Right-click menu at mouse coordinates, items with accelerators, separators, submenus, keyboard navigation, click-outside to dismiss.
**Test:** Right-click shows menu, arrow keys navigate, Enter selects.

---

#### 4.7 FileBrowser
**File:** New `file-browser.ts`
**What:** Directory listing with icons (📁/📄), Enter to open, Backspace to go up, selection, scroll, show hidden, filter pattern, refresh.
**Test:** Navigate directories, select file.

---

#### 4.8 Breadcrumbs
**File:** New `breadcrumbs.ts`
**What:** Path segments with separators (/), clickable, truncation with ellipsis.
**Test:** Breadcrumbs show `~>/project/src/components` with clickable segments.

---

#### 4.9 Diff Viewer
**File:** New `diff.ts`
**What:** Parse unified diff (`@@ -1,3 +1,4 @@`), render with colors (green/red/dim), line numbers, word-level diff highlighting.
**Test:** Render diff, verify added lines green, removed red.

---

#### 4.10 ModelSelector
**File:** New `model-selector.ts`
**What:** List of LLM models (from LLM package), show provider, context window, cost, search/filter. Likely uses `SelectList` internally.
**Test:** Model selector displays available models with metadata.

---

#### 4.11 Theme System
**File:** `themes.ts` (exists? complete it)
**What:**
- `Theme` interface with color roles (primary, secondary, accent, background, foreground, success, warning, error, border, selected, highlighted, dim)
- Presets: `darkTheme`, `lightTheme`, `highContrastTheme`
- `ThemeManager`: `setTheme()`, `getTheme()`, `onChange(listener)`
- File watcher for `~/.config/picro/tui/theme.json`
- Helper functions: `theme.fg(role, text)`, `theme.bg(role, text)`
- Reactivity: components invalidate on theme change
**Test:** Switch theme, components update automatically.

---

### P5: Polish & Completeness (Week 8)

#### 5.1 Enhance Input Component
**File:** `input.ts`
**Check against legacy:**
- Home/End, Ctrl+A/E
- Word deletion (Ctrl+W, Ctrl+Backspace)
- History for multi-line? (if needed)
- Selection with Shift+arrows?
**Test:** Input handles all expected keybindings.

---

#### 5.2 Complete Keybindings
**File:** `keybindings.ts`
**Add if missing:**
- `isKeyRepeat()`
- `isKittyProtocolActive()`, `setKittyProtocolActive()` (maybe in keys.ts)
- `Key` enum/object: `Key.Enter`, `Key.Escape`, etc.
- `decodeKittyPrintable()` (already in keys)
**Test:** Functions return correct values.

---

#### 5.3 Complete Fuzzy Matching
**File:** `fuzzy.ts`
**Ensure exports:**
- `fuzzyMatch(text, query)` → `{score, matches[]}`
- `fuzzyFilter(items, query, accessor)` → sorted filtered
- `fuzzyHighlight(text, query)` → ANSI highlighted string
**Test:** Fuzzy filter ranks "abc" before "acb" for query "ab".

---

#### 5.4 Terminal Enhancements
**File:** `terminal.ts`
**Add:**
- `queryCellSize(): Promise<{width, height}>` (CSI 16 t)
- Ensure `rows`, `columns` properties cached and updated on resize
- `clearScreen()` robust implementation
- `moveTo(row, col)` absolute
- `writeImage(sequence)` for terminal images
**Test:** Query cell size returns reasonable defaults.

---

#### 5.5 Utilities Enhancement
**File:** `internal-utils.ts`
**Add:**
- `truncateToWidth(text, width, ellipsis?)` — more advanced than `truncateText`
- `expandTabs(text, tabSize=2)` — expand `\t` to spaces
- Consider integrating `east-asian-width` package for accurate CJK width (install dep)
**Test:** Tab expansion works; truncateToWidth respects ANSI codes.

---

## 🧪 Testing Requirements

For each new feature:
1. Unit test in `test/` directory
2. Cover normal operation, edge cases, error conditions
3. Visual regression testing if possible (capture rendered output)
4. Performance tests for rendering optimizations

**Coverage goal:** ≥80% for new code

---

## 🔒 Copyright Compliance

**Allowed:**
- Study legacy code to understand algorithms, data structures, APIs
- Replicate function **signatures** and **behavioral contracts**
- Use similar design patterns (e.g., overlay stack, dirty flag, etc.)
- Match public API naming conventions

**Forbidden:**
- Copy-paste any function body, class implementation, or algorithm
- Copy comments, docstrings, or variable names that are creative
- Directly translate legacy code line-by-line
- Use legacy's helper functions; write your own from scratch

**Process for each TODO item:**
1. Read legacy implementation thoroughly (understand inputs, outputs, edge cases)
2. Write pseudocode design in own words
3. Implement fresh without looking at legacy code (may peek at legacy for inspiration but not copy)
4. Write tests based on legacy test expectations
5. Compare behavior manually; ensure functional equivalence

---

## 📈 Progress Tracking

Use GitHub issues or this file to track status:

- [ ] Phase 1: Core Rendering Parity (8 todos)
- [ ] Phase 2: Terminal Images & Autocomplete (4 todos)
- [ ] Phase 3: Editor & Components (5 todos)
- [ ] Phase 4: UI Component Library (11 todos)
- [ ] Phase 4.5: Application Components (13 todos) ← NEW
- [ ] Phase 5: Polish & Testing (6 todos)

**Total:** ~47 implementation tasks (34 + 13 app components)

---

## 🚀 Next Steps

**Start immediately with:** Phase 1, Todo 1 — Panel margin support.

1. Read legacy `OverlayOptions.margin` and `resolveOverlayLayout()` to understand behavior
2. Extend `PanelOptions` in `base.ts` with `margin?: number | PanelMargin`
3. Update `calculatePanelPosition()` in `tui.ts` to apply margin based on anchor
4. Write test: panel with margin centers correctly with padding
5. Verify existing tests still pass

**Proceed sequentially** through the list, marking items done as completed.

---

**Remember:** The goal is not to replicate legacy's code, but to achieve **feature parity** with a **clean, modern rewrite** that respects the same APIs and behaviors. Do not cut corners — implement properly with tests.

---

*Last updated: 2026-04-26*  
*Status: Starting Sprint 1*
