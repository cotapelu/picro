# Kiến trúc TUI

## Tổng quan

TUI sử dụng **phân tầng theo dependency** với 5 lớp. Tất cả components nằm trong `src/components/`.

```
Lớp 5: Engine (tui, terminal, keybindings, themes)
    ↑ điều phối
Lớp 4: Complex Components (editor, modal, selectors, messages, ...)
    ↑ kế thừa/compose
Lớp 3: Interactive Basic (input, select-list, settings-list)
    ↑ kế thừa/compose
Lớp 2: Simple Components (spacer, badge, text, box, ...)
    ↑ import
Lớp 1: Foundation (keys, utils, fuzzy, base, ...)
```

---

## Lớp 1: Foundation

**Mục đích:** Utilities và interfaces độc lập hoàn toàn.

**Files:**
- `base.ts`: `UIElement`, `ElementContainer`, types
- `keys.ts`: `parseKey()`, `matchesKey()`, Kitty protocol
- `utils.ts`: `visibleWidth()`, `wrapText()`, `truncateToWidth()`, ANSI handling
- `fuzzy.ts`: `fuzzyMatch()`, `fuzzyFilter()`
- `autocomplete.ts`: `AutocompleteProvider`, `CombinedAutocompleteProvider`
- `kill-ring.ts`, `undo-stack.ts`: Data structures
- `editor-component.ts`: Editor interface (types only)

**Dependencies:** Node built-ins, `get-east-asian-width` (external).

---

## Lớp 2: Simple Components

**Mục đích:** Leaf components và simple containers, render-only.

**Chars:**
- Không có state phức tạp
- Không xử lý input
- Chỉ implement `draw(context): string[]`
- Có cache (optional)

**Examples:**
- `spacer.ts`, `divider.ts` - layout
- `badge.ts`, `progress-bar.ts`, `rating.ts` - widgets
- `text.ts`, `truncated-text.ts`, `box.ts` - text containers

**Dependencies:** Chỉ Lớp 1 (`utils`, `base`).

---

## Lớp 3: Interactive Basic

**Mục đích:** Components có state và handle key events.

**Chars:**
- Implements `InteractiveElement` (`isFocused`)
- Implements `handleKey(key: KeyEvent)`
- Có selection state, scrolling, filtering
- Dùng `getKeybindings()` để match keys

**Components:**
- `input.ts` - single-line editor
- `select-list.ts` - scrollable list
- `settings-list.ts` - toggle list

**Dependencies:** L1 (keys, utils) + L2 + `keybindings.ts`.

---

## Lớp 4: Complex Components

**Mục đích:** Tích hợp sâu với Engine, overlay system, hoặc external libs.

**Chars:**
- Dùng `TerminalUI.showOverlay()` (modal, toast, context-menu)
- Compose nhiều components (ví dụ: `editor` dùng `select-list`, `autocomplete`)
- Có logic phức tạp, lifecycle, async
- External dependencies (highlight.js, image libs)

**Categories:**
1. **Editors:** `editor.ts` (full editor), `markdown.ts` (syntax highlight), `terminal-image.ts` (images)
2. **Overlays:** `modal.ts`, `toast.ts`, `context-menu.ts`
3. **Chrome:** `footer.ts`, `stats-footer.ts`, `command-palette.ts`
4. **Panels:** `file-browser.ts`, `memory-panel.ts`, `debug-panel.ts`
5. **Dialogs:** `login-dialog.ts`
6. **Selectors** (13 types): Tất cả dựa trên `select-list` hoặc `settings-list`
7. **Messages** (11 types): Chat bubbles với styling
8. **Utilities:** `dynamic-border.ts`, `diff.ts`, `visual-truncate.ts`, `keybinding-hints.ts`

**Dependencies:** L1-3 + Engine (`tui.ts`, `terminal.ts`).

---

## Lớp 5: Engine

**Mục đích:** Orchestration cao nhất - điều phối render loop, input, overlays.

**Components:**

| File | Mô tả |
|------|-------|
| `tui.ts` | `TerminalUI` class - main orchestrator |
| `terminal.ts` | `ProcessTerminal` - stdin/stdout abstraction |
| `keybindings.ts` | `KeybindingsManager`, global registry |
| `themes.ts` | `ThemeManager`, theme definitions |
| `stdin-buffer.ts` | Input batch splitting |

**TerminalUI responsibilities:**
- Input pipeline: `Terminal` → `StdinBuffer` → `keys.parseKey()` → `keybindings` → `focusedElement.handleKey()`
- Render pipeline: `requestRender()` → debounce → `children.draw()` + overlay composite → `diff()`/`fullRedraw()` → `Terminal.write()`
- Overlay stack: positioning, focus trapping, z-index
- Hardware cursor positioning cho IME

**Dependencies:** Lớp 1 (keys, utils), không import Lớp 2-4 components trực tiếp (chỉ qua `UIElement` interface).

---

## Dependency Rules

✅ **Được phép:**
- Layer N import Layer < N
- Engine (`keybindings.ts`, `themes.ts`) import từ bất kỳ đâu (global services)

❌ **Cấm:**
- Layer N import Layer > N (circular dependency风险)

**Kiểm tra:** Tất cả files tuân thủ. Ngoại lệ: `stats-footer.ts` là Lớp 4 (kế thừa `Footer`), không phải L2.

---

## Design Principles

1. **UIElement interface:** Tất cả components implements `draw(context)`. Đơn giản, testable.
2. **ElementContainer:** Base class cho composition (`append`, `remove`, `clear`).
3. **InteractiveElement:** Focus management qua `isFocused` + `CURSOR_MARKER`.
4. **Overlay system:** Stack-based, compositing trong `tui.ts`, positioning anchor-based.
5. **Caching:** Component tự quản lý cache (ví dụ: `Text` cache `cachedLines`).
6. **Theming:** Theme functions `(s: string) => string` trả về ANSI codes.
7. **Keybindings:** Global registry, có context stacks.
8. **Incremental rendering:** Diff algorithm trong `tui.ts` giảm flicker.
9. **Hardware cursor:** IME support qua `CURSOR_MARKER` + `positionHardwareCursor()`.
10. **Separation:** Foundation (L1) không biết gì về TerminalUI.

---

## Flow Examples

### Input flow:
```
ProcessTerminal (raw data)
    ↓
StdinBuffer (batch split)
    ↓
keys.parseKey() → KeyEvent
    ↓
keybindings.matches()
    ↓
focusedElement.handleKey()
    ↓
element.setState() / callbacks
    ↓
tui.requestRender()
```

### Render flow:
```
tui.requestRender() (debounced, min 16ms)
    ↓
renderAll() → children.draw() + overlayComposite()
    ↓
computeDiff() (so với previousLines)
    ↓
if small diff → incrementalRender()
else → fullRedraw()
    ↓
Terminal.write(buffer) với synchronized output (\x1b[?2026h/l)
```

### Overlay flow:
```
tui.showOverlay(component, options)
    ↓
push overlayStack (with preFocus)
    ↓
setFocus(component) if visible
    ↓
render: compositeOverlays() → gọi `component.render(width)` → composite vào buffer
    ↓
handle key: focused overlay's handleKey()
    ↓
overlay.close() → pop stack → restore focus
```

---

## Reusability

Components có thể standalone (testable without TerminalUI):
- **Lớp 1-2:** Hoàn toàn độc lập.
- **Lớp 3:** Có thể test với mock `KeybindingsManager`.
- **Lớp 4:** Cần `TerminalUI` hoặc overlay system.
- **Engine:** Cần terminal环境.

---

## Potential Refactorings

- Extract `OverlayManager` từ `tui.ts` → testable riêng.
- Inject `KeybindingsManager` vào interactive components thay vì `getKeybindings()` singleton.
- Split `utils.ts` (text) vs `ansi-utils.ts` (SGR tracking).
- Move `stdin-buffer.ts` vào Engine (trong cùng file với terminal?).

---

*Last updated: 2025-04-29*
