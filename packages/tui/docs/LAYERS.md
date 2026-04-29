# Phân Tầng Components (Conceptual)

**Lưu ý:** Đây là phân lớp **logic** dựa trên dependency. Tất cả files đều nằm trong `src/components/`.

---

## Lớp 1: Foundation

Module độc lập, không phụ thuộc UI:

- `keys.ts` - Keyboard parsing, Kitty protocol
- `utils.ts` - Text width, ANSI, wrapping
- `fuzzy.ts` - Fuzzy matching
- `autocomplete.ts` - Autocomplete engine
- `kill-ring.ts` - Emacs clipboard ring
- `undo-stack.ts` - Generic undo stack
- `editor-component.ts` - Editor interface (types)
- `base.ts` - Core interfaces (`UIElement`, `ElementContainer`)

---

## Lớp 2: Simple Components

Leaf components và container đơn giản, chỉ dùng Lớp 1:

- `spacer.ts`, `divider.ts`, `badge.ts`
- `progress-bar.ts`, `rating.ts`, `stepper.ts`
- `text.ts`, `truncated-text.ts`, `box.ts`
- `countdown-timer.ts` - (inject render callback, **không** dùng `TerminalUI`)

---

## Lớp 3: Interactive Basic

Interactive components với state và key handling:

- `input.ts`
- `select-list.ts`
- `settings-list.ts`

---

## Lớp 4: Complex Components

Tích hợp sâu với Engine, overlay system:

- **Editors:** `editor.ts`, `markdown.ts`
- **Overlays:** `modal.ts`, `toast.ts`, `context-menu.ts`
- **Chrome:** `footer.ts`, `stats-footer.ts`, `command-palette.ts`
- **Panels:** `file-browser.ts`, `memory-panel.ts`, `debug-panel.ts`
- **Dialogs:** `login-dialog.ts`
- **Selectors** (13 loại): `session-selector.ts`, `model-selector.ts`, `oauth-selector.ts`, `extension-selector.ts`, `extension-input.ts`, `extension-editor.ts`, `settings-selector.ts`, `theme-selector.ts`, `show-images-selector.ts`, `tree-selector.ts`, `thinking-selector.ts`, `scoped-models-selector.ts`, `config-selector.ts`
- **Messages** (11 loại): `user-message.ts`, `assistant-message.ts`, `tool-message.ts`, `bash-execution-message.ts`, `custom-message.ts`, `tool-execution.ts`, `branch-summary-message.ts`, `compaction-summary-message.ts`, `skill-invocation-message.ts`, `diff.ts`, và Easter eggs (`armin.ts`, `daxnuts.ts`, `earendil-announcement.ts`)
- **Utilities:** `terminal-image.ts`, `dynamic-border.ts`, `visual-truncate.ts`, `keybinding-hints.ts`

---

## Lớp 5: Engine

Orchestration layer - phần cao nhất:

- `tui.ts` - `TerminalUI` (render loop, overlay stack, focus)
- `terminal.ts` - `ProcessTerminal` (IO abstraction)
- `keybindings.ts` - Global keybinding registry
- `themes.ts` - Theme management
- `stdin-buffer.ts` - Input buffering

---

## Dependency Rules

- ✅ Layer N có thể import Layer < N
- ❌ Layer N **không được** import Layer > N
- ✅ `keybindings.ts`, `themes.ts` (Engine) là global services, có thể import từ bất kỳ đâu.

---

## Diagram

```
┌─────────────────────────────────────┐
│  Layer 5: Engine                    │
│  (tui, terminal, keybindings, themes)│
├─────────────────────────────────────┤
│  Layer 4: Complex Components        │
│  • Editors & Display                │
│  • Overlays                         │
│  • Panels & Dialogs                 │
│  • Selectors (13)                   │
│  • Messages (11)                    │
└──────────────┬──────────────────────┘
               │ extends/composes
┌──────────────┴──────────────────────┐
│  Layer 3: Interactive Basic         │
│  • input                            │
│  • select-list                      │
│  • settings-list                    │
└──────────────┬──────────────────────┘
               │ extends/composes
┌──────────────┴──────────────────────┐
│  Layer 2: Simple Components         │
│  • base (foundation)                │
│  • layout (spacer, divider, box)   │
│  • widgets (badge, progress, rating, stepper) │
│  • text (text, truncated-text)      │
└──────────────┬──────────────────────┘
               │ imports
┌──────────────┴──────────────────────┐
│  Layer 1: Foundation                │
│  • keys                             │
│  • utils                            │
│  • fuzzy                            │
│  • autocomplete                     │
│  • data structures (kill-ring, undo-stack) │
└─────────────────────────────────────┘
```

---

*Xem chi tiết: [ARCHITECTURE.md](./ARCHITECTURE.md)*
