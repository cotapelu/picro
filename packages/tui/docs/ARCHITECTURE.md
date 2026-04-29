# Kiến trúc TUI - Phân tầng thành phần

## Tổng quan

Thư viện TUI được xây dựng theo mô hình phân tầng, với các lớp phụ thuộc rõ ràng:

```
Lớp 1 (Foundation).py
    │
    ├── keys.ts           - Xử lý phím, Kitty protocol
    ├── utils.ts          - Text width, ANSI, wrapping
    ├── fuzzy.ts          - Fuzzy matching
    ├── autocomplete.ts   - Autocomplete engine
    ├── kill-ring.ts      - Emacs clipboard
    ├── undo-stack.ts     - Generic undo
    └── editor-component.ts (interface)
    │
Lớp 2 (Simple Components)
    │
    ├── base.ts           - UIElement, ElementContainer
    ├── spacer.ts         - Empty spacing
    ├── divider.ts        - Visual separator
    ├── badge.ts          - Status labels
    ├── progress-bar.ts   - Progress indicator
    ├── rating.ts         - Star rating
    ├── stepper.ts        - Multi-step wizard
    ├── countdown-timer.ts - Timer utility
    ├── text.ts           - Multi-line text
    ├── truncated-text.ts - Truncated text
    └── box.ts            - Container w/ padding/bg
    │
Lớp 3 (Interactive Basic)
    │
    ├── input.ts          - Single-line input
    ├── select-list.ts    - Scrollable list
    └── settings-list.ts  - Toggle settings
    │
Lớp 4 (Complex Components)
    │
    ├── editor.ts         - Multi-line editor (rich)
    ├── markdown.ts       - Markdown renderer
    ├── terminal-image.ts - Image rendering
    ├── modal.ts          - Modal overlay
    ├── toast.ts          - Toast notifications
    ├── footer.ts         - Status bar
    ├── command-palette.ts - Command palette
    ├── context-menu.ts   - Context menu
    ├── file-browser.ts   - File explorer
    ├── login-dialog.ts   - Auth dialog
    ├── memory-panel.ts   - Memory manager
    ├── debug-panel.ts    - Debug info
    │
    ├── Selectors (13 loại):
    │   ├── session-selector.ts
    │   ├── model-selector.ts
    │   ├── oauth-selector.ts
    │   ├── extension-selector.ts
    │   ├── theme-selector.ts
    │   ├── tree-selector.ts
    │   ├── thinking-selector.ts
    │   └── ... (scoped-models, extension-input/editor, settings, show-images)
    │
    ├── Messages (11 loại):
    │   ├── user-message.ts
    │   ├── assistant-message.ts
    │   ├── tool-message.ts
    │   ├── bash-execution-message.ts
    │   ├── custom-message.ts
    │   ├── tool-execution.ts
    │   ├── branch-summary-message.ts
    │   ├── compaction-summary-message.ts
    │   ├── skill-invocation-message.ts
    │   ├── diff.ts
    │   └── armin.ts, daxnuts.ts, earendil-announcement.ts
    │
    └── Core Engine:
        ├── tui.ts          - TerminalUI (render orchestration)
        ├── terminal.ts     - ProcessTerminal (IO abstraction)
        ├── keybindings.ts  - Global keybinding registry
        └── themes.ts       - Theme management
```

---

## Lớp 1: Foundation (Không phụ thuộc)

**Đặc điểm:** Hoàn toàn độc lập, không import component UI nào.

| File | Dependencies | Mô tả |
|------|-------------|-------|
| `keys.ts` | Node built-ins | Parse phím, Kitty protocol, `matchesKey()`, `parseKey()` |
| `utils.ts` | `get-east-asian-width` | `visibleWidth()`, `wrapText()`, `truncateToWidth()`, ANSI handling |
| `fuzzy.ts` | none | `fuzzyMatch()`, `fuzzyFilter()` - fuzzy search |
| `autocomplete.ts` | `fuzzy.ts`, `fs`, `path` | `AutocompleteProvider`, `CombinedAutocompleteProvider` |
| `kill-ring.ts` | none | `KillRing` - clipboard ring (Emacs style) |
| `undo-stack.ts` | none | `UndoStack<T>` - generic undo với clone |
| `editor-component.ts` | type imports | Interface cho custom editor |

**Tổng:** 7 files

---

## Lớp 2: Simple Components

**Đặc điểm:** Chỉ dùng Lớp 1 + types, không phụ thuộc component khác. Lớp "leaf" hoặc container đơn giản.

| Component | Dependencies | Ghi chú |
|-----------|-------------|---------|
| `base.ts` | none | Core: `UIElement`, `ElementContainer`, types |
| `spacer.ts` | `base` | Render empty lines |
| `divider.ts` | `base`, `internal-utils` | Separator với/không label |
| `badge.ts` | `base`, `internal-utils` | Status badge với themes |
| `progress-bar.ts` | `base` | Visual progress bar |
| `rating.ts` | `base`, `internal-utils` | Star ratings |
| `stepper.ts` | `base`, `internal-utils` | Wizard/step indicator |
| `countdown-timer.ts` | `tui` (type only) | Countdown utility (không render) |
| `text.ts` | `base`, `utils` | Multi-line text + wrapping + padding |
| `truncated-text.ts` | `base`, `utils` | Single-line truncation |
| `box.ts` | `base`, `utils` | Container với padding/background |

**Tổng:** 11 components

---

## Lớp 3: Interactive Basic

**Đặc điểm:** Có xử lý key events, state, focus. Dùng Lớp 1-2.

| Component | Dependencies | Mô tả |
|-----------|-------------|-------|
| `input.ts` | `base`, `keys`, `internal-utils`, `keybindings` | Single-line text + history + kill ring |
| `select-list.ts` | `base`, `keys`, `utils`, `keybindings` | Scrollable list với selection |
| `settings-list.ts` | `base`, `keys`, `utils`, `keybindings` | Toggle settings list |

**Tổng:** 3 components

---

## Lớp 4: Complex Components

**Đặc điểm:** Tích hợp nhiều thành phần, dùng overlay system, theming, external libs, hoặc `TerminalUI`.

### 4.1 Editor & Display
- `editor.ts`: Multi-line editor (undo, kill ring, autocomplete, word wrap)
- `markdown.ts`: Markdown + syntax highlight (`highlight.js`)
- `terminal-image.ts`: Kitty/iTerm2 image protocols

### 4.2 Overlay System
- `modal.ts`: Modal với backdrop
- `toast.ts`: Temporary notifications
- `context-menu.ts`: Right-click menu

### 4.3 UI Chrome
- `footer.ts`: Status bar với left/right items
- `command-palette.ts`: Command palette (dựa trên `select-list`)
- `file-browser.ts`: File explorer với fuzzy search
- `debug-panel.ts`: Debug info panel
- `memory-panel.ts`: Memory viewer/editor

### 4.4 Selectors (Dialogs)
Tất cả đều dựa trên `select-list`, `settings-list`, hoặc custom:
- `session-selector.ts`
- `model-selector.ts`
- `oauth-selector.ts`
- `extension-selector.ts`
- `extension-input.ts`, `extension-editor.ts`
- `settings-selector.ts`
- `theme-selector.ts`
- `show-images-selector.ts`
- `tree-selector.ts`
- `thinking-selector.ts`
- `scoped-models-selector.ts`

### 4.5 Message Bubbles (Chat UI)
- `user-message.ts`
- `assistant-message.ts`
- `tool-message.ts`
- `bash-execution-message.ts`
- `custom-message.ts`
- `tool-execution.ts`
- `branch-summary-message.ts`
- `compaction-summary-message.ts`
- `skill-invocation-message.ts`
- `diff.ts` (diff view)
- Easter eggs: `armin.ts`, `daxnuts.ts`, `earendil-announcement.ts`

### 4.6 Core Engine
- `tui.ts`: `TerminalUI` class - orchestration, render loop, overlay stack, focus management
- `terminal.ts`: `ProcessTerminal` - stdin/stdout abstraction, Kitty protocol detection
- `keybindings.ts`: Global keybinding registry
- `themes.ts`: Theme definitions + manager

**Tổng Layer 4:** ~40+ components

---

## Core Engine (TerminalUI)

`TerminalUI` (tui.ts) là orchestrator cao nhất:

**Input flow:**
```
ProcessTerminal (raw data)
    ↓
StdinBuffer (batch splitting)
    ↓
keys.parseKey() → KeyEvent
    ↓
keybindings.matches()
    ↓
focusedElement.handleKey() or overlay handler
```

**Render flow:**
```
requestRender() → debounce (16ms min)
    ↓
children.draw() + overlay composite
    ↓
diff algorithm (incremental) or fullRedraw()
    ↓
Terminal.write() with synchronized output (\x1b[?2026h/l)
```

**Overlay system:**
- Stack-based (z-index theo focusOrder)
- Positioning: anchor-based (9 vị trí) + absolute/percentage
- Focus trapping và autofocus

---

## Utilities & Support

| File | Mục đích |
|------|---------|
| `stdin-buffer.ts` | Split batched input thành sequences |
| `keybindings.ts` | Registry + `getKeybindings()` singleton |
| `themes.ts` | Theme definitions + `ThemeManager` |
| `diff.ts` | `renderDiff()` - side-by-side diff |
| `visual-truncate.ts` | Truncation với grapheme awareness |
| `internal-utils.ts` | `extractSegments()`, `sliceByColumn()` |

---

## Dependency Map

```
Layer 1 (Foundation)
├─ keys.ts
├─ utils.ts
├─ fuzzy.ts
├─ autocomplete.ts
├─ kill-ring.ts
├─ undo-stack.ts
└─ editor-component.ts

Layer 2 (Simple)
├─ base.ts (dùng Layer 1)
├─ spacer.ts (base)
├─ divider.ts (base, utils)
├─ badge.ts (base, utils)
├─ progress-bar.ts (base)
├─ rating.ts (base, utils)
├─ stepper.ts (base, utils)
├─ countdown-timer.ts (tui type)
├─ text.ts (base, utils)
├─ truncated-text.ts (base, utils)
└─ box.ts (base, utils)

Layer 3 (Interactive Basic)
├─ input.ts (L1+L2, keybindings)
├─ select-list.ts (L1+L2, keybindings)
└─ settings-list.ts (L1+L2, keybindings)

Layer 4 (Complex)
├─ editor.ts (L1-3, select-list, fuzzy, autocomplete)
├─ markdown.ts (L1-2, highlight.js)
├─ terminal-image.ts (L1, image libs)
├─ modal.ts, toast.ts, context-menu.ts (tui)
├─ footer.ts (tui)
├─ command-palette.ts (L3, fuzzy)
├─ file-browser.ts (L3, fuzzy)
├─ All selectors (L3, fuzzy, tui)
├─ All messages (L2, utils)
└─ Core: tui.ts, terminal.ts, keybindings.ts, themes.ts
```

---

## Design Principles

1. **Lớp dưới không biết lớp trên**: Foundation không import component UI.
2. **Component leaf đơn giản**: Chỉ `draw()`, không có children.
3. **Container quản lý children**: `ElementContainer` cung cấp `append()`, `remove()`.
4. **InteractiveElement**: Focus management qua `isFocused` + `CURSOR_MARKER`.
5. **Overlay system**: Stack-based, compositing ở `tui.ts`.
6. **Caching**: Component tự quản lý cache (kiểm tra `text`, `width`, theme).
7. **Theming**: Theme functions `(str) => string` với ANSI codes.
8. **Keybindings**: Centralized qua `getKeybindings().matches()`.
9. **Incremental rendering**: Diff algorithm trong `tui.ts` để giảm flicker.
10. **Hardware cursor**: IME support qua `CURSOR_MARKER` + hardware cursor positioning.

---

## Reusability Checklist

Component có thể tách ra dùng độc lập nếu:
- ✅ Chỉ dùng `base.ts` + `utils.ts`
- ✅ Không dùng `TerminalUI` overlay system
- ✅ Không cần focus management
- ✅ Render-only (no imperative API)

**Như vậy có thể tách:** `Spacer`, `Divider`, `Badge`, `ProgressBar`, `Rating`, `Stepper`, `Text`, `TruncatedText`, `Box`.

**Cần TerminalUI:** `Input`, `SelectList`, `SettingsList` (vì focus handling).

**Cần overlay/context:** Modal, Toast, CommandPalette, ContextMenu, Footer.

---

## Notes

- `llm-context/tui-core/` là reference implementation (legacy style). `src/` là implementation hiện tại với API khác biệt.
- Lớp 1 và 2 có thể chuyển thành standalone package.
- `countdown-timer.ts` thuộc Layer 2 nhưng dùng `TerminalUI` type → có thể refactor để không phụ thuộc.
- `tui.ts` có thể tách `OverlayManager` và `RenderEngine` riêng trong tương lai.

---

*Last updated: 2025-04-29*
