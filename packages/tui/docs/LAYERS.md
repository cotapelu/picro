# Các Lớp Phân Tầng - Tóm tắt

## Lớp 1: Foundation

Các module standalone, không phụ thuộc UI:

- `keys.ts` - Keyboard parsing
- `utils.ts` - Text/ANSI utilities
- `fuzzy.ts` - Fuzzy matching
- `autocomplete.ts` - Autocomplete engine
- `kill-ring.ts` - Clipboard ring
- `undo-stack.ts` - Undo stack
- `editor-component.ts` - Editor interface (types)

**Đặc trưng:** Có thể dùng trong bất kỳ môi trường Node.js.

---

## Lớp 2: Simple Components

Leaf components và container đơn giản, chỉ dùng Lớp 1:

- `base.ts` - Core interfaces
- `spacer.ts`, `divider.ts`, `badge.ts`
- `progress-bar.ts`, `rating.ts`, `stepper.ts`
- `text.ts`, `truncated-text.ts`, `box.ts`
- `countdown-timer.ts` (no TUI dependency)

**Lưu ý:** `stats-footer.ts` thuộc Lớp 4 (kế thừa Footer). - Timer utility (inject render callback, no TUI dependency)

**Đặc trưng:** Render-only, không cần focus/overlay.

---

## Lớp 3: Interactive Basic

Interactive components với state và key handling:

- `input.ts`
- `select-list.ts`
- `settings-list.ts`

**Phụ thuộc:** Lớp 1 + Lớp 2 + `keybindings.ts`.

---

## Lớp 4: Complex Components

Tích hợp sâu với TerminalUI:

- **Editors:** `editor.ts`, `markdown.ts`
- **Overlays:** `modal.ts`, `toast.ts`, `context-menu.ts`
- **Chrome:** `footer.ts`, `command-palette.ts`
- **Panels:** `file-browser.ts`, `memory-panel.ts`, `debug-panel.ts`
- **Selectors:** 13 loại (session, model, oauth, extension, theme, tree, thinking, settings, ...)
- **Messages:** 11 loại (user, assistant, tool, bash, custom, diff, ...)
- **Utilities:** `terminal-image.ts`, `dynamic-border.ts`

---

## Core Engine (Top Layer)

- `tui.ts` - `TerminalUI` (orchestration, render loop, overlay stack)
- `terminal.ts` - `ProcessTerminal` (IO abstraction)
- `keybindings.ts` - Global keybinding registry
- `themes.ts` - Theme management

---

## Diagram

```
┌─────────────────────────────────────┐
│  Application Layer                  │
│  (interactive-mode.ts, cli.ts)      │
├─────────────────────────────────────┤
│  Layer 4: Complex Components        │
│  ───────────────────────────────    │
│  • Editors (editor, markdown)       │
│  • Overlays (modal, toast, ctx)     │
│  • Panels (file, memory, debug)     │
│  • Selectors (13 types)             │
│  • Messages (11 types)              │
└──────────────┬──────────────────────┘
               │ extends/composes
┌──────────────┴──────────────────────┐
│  Layer 3: Interactive Basic         │
│  ───────────────────────────────    │
│  • input                            │
│  • select-list                      │
│  • settings-list                    │
└──────────────┬──────────────────────┘
               │ extends/composes
┌──────────────┴──────────────────────┐
│  Layer 2: Simple Components         │
│  ───────────────────────────────    │
│  • base (UIElement, Container)      │
│  • spacer, divider, badge           │
│  • progress, rating, stepper        │
│  • text, truncated-text, box        │
└──────────────┬──────────────────────┘
               │ imports
┌──────────────┴──────────────────────┐
│  Layer 1: Foundation                │
│  ───────────────────────────────    │
│  • keys (parseKey, matchesKey)      │
│  • utils (visibleWidth, wrap...)    │
│  • fuzzy (fuzzyMatch, fuzzyFilter)  │
│  • autocomplete                     │
│  • kill-ring, undo-stack            │
└─────────────────────────────────────┘
```

---

## Dependency Rules

- ✅ Layer 2 có thể import Layer 1
- ✅ Layer 3 có thể import Layer 1-2
- ✅ Layer 4 có thể import Layer 1-3
- ❌ Layer N không được import Layer > N
- ✅ `keybindings.ts` và `themes.ts` là global services, có thể import từ bất cứ đâu
- ✅ `tui.ts`/`terminal.ts` chỉ dùng ở Layer 4+ (engine)

---

*Xem chi tiết: [ARCHITECTURE.md](./ARCHITECTURE.md)*
