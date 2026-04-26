# Legacy vs New TUI: Feature Gap Analysis

## Overview
- **Legacy**: `pi-tui-legacy/` - 54 files, ~25,000 LOC
- **New**: `src/` - 39 files, ~8,500 LOC (after cleanup)
- **Purpose**: New is a minimal subset for coding agent; legacy was a full framework

---

## Component Mapping (Legacy → New)

### ✅ Fully Implemented (Parity)
| Legacy Component | New Equivalent |
|------------------|----------------|
| Text | Text |
| Box | Box |
| Spacer | Spacer |
| Markdown | Markdown (with syntax highlighting) |
| SelectList | SelectList |
| SettingsList | SettingsList |
| TruncatedText | TruncatedText |
| DynamicBorder | DynamicBorder |
| Fuzzy matching | fuzzyFilter (partial) |

### ⚠️ Partially Implemented (Missing Features)
| Legacy Component | New Status | Missing |
|------------------|------------|---------|
| Loader | BorderedLoader only | CancellableLoader variant |
| Input | ❌ No direct equivalent | Coding agent has InputBox instead |
| Editor | ❌ Full editor missing | Kill ring, undo stack, multi-line |
| FileBrowser | ❌ Not implemented | File/directory browsing UI |
| Footer | ✅ Basic footer exists | Legacy has complex token stats, git branch, cwd, extension status |
| Modal | ❌ Not in public API | Dialog system |
| Toast | ❌ Not in public API | Notification system |
| ContextMenu | ❌ Not in public API | Right-click menus |
| ProgressBar | ❌ Not in public API | Progress indicator |
| Stepper | ❌ Not in public API | Multi-step wizard |
| Badge | ❌ Not in public API | Status badges |
| Rating | ❌ Not in public API | Star ratings |
| CommandPalette | ❌ Not in public API | CMD+Shift+P palette |
| Diff | ❌ Not in public API | Git diff viewer |
| Breadcrumbs | ❌ Not in public API | Navigation breadcrumbs |
| ModelSelector | ❌ Not in public API | LLM model picker |

### ❌ Not Implemented (Missing Entirely)
| Legacy Feature | Description |
|----------------|-------------|
| Terminal Image Support | Kitty/iTerm2/WezTerm image protocols (381 lines in terminal-image.ts) |
| Autocomplete System | File path + slash command completion with fuzzy matching (773 lines) |
| Kill Ring | Emacs-style kill/yank buffer for editor |
| Undo/Redo Stack | Generic undo management |
| CustomEditor extension | Plugin point for custom editors |
| Theme system | Dynamic theme switching with file watcher |
| Input Listener Chain | Pre-process keyboard input globally with chainable handlers |

---

## API Differences: TerminalUI/TUI Class

### Legacy TUI Methods (Not in New)
- `addInputListener(listener)` / `removeInputListener()` — Chainable input preprocessing
- `hideOverlay()` — Hide active overlay
- `hasOverlay()` — Check if any overlay visible
- `getFocusedElement()` — Returns `Component | null`
- `getSize()` — Same
- `getClearOnShrink()` / `setClearOnShrink()` — Same
- `getShowHardwareCursor()` / `setShowHardwareCursor()` — Same

### New TerminalUI Methods (Not in Legacy)
- `addKeyHandler(handler)` / `removeKeyHandler()` — Simple key handler set (legacy used input listeners)
- `showPanel()` / `removePanel()` / `setPanelHidden()` / `isPanelHidden()` — Basic panel management
- `getTopmostVisiblePanel()` — Legacy has `getTopmostVisibleOverlay()`

**Key Difference:** Legacy uses `showOverlay()` with rich `OverlayOptions`; New uses `showPanel()` with simpler `PanelOptions`.

---

## Overlay/Panel System Comparison

### Legacy OverlayOptions (Rich)
```typescript
interface OverlayOptions {
  // Sizing
  width?: number | `${number}%`;
  minWidth?: number;
  maxHeight?: number | `${number}%`;    // ← Missing in new
  
  // Positioning (anchor-based)
  anchor?: 'center' | 'top-left' | ...;  // 9 anchors
  offsetX?: number;
  offsetY?: number;
  margin?: number | OverlayMargin;       // ← Missing in new (margin object)
  
  // Positioning (absolute/percentage)
  row?: number | `${number}%`;
  col?: number | `${number}%`;
  
  // Visibility
  visible?: (termWidth: termHeight) => boolean;  // Dynamic visibility
  nonCapturing?: boolean;                         // Don't steal focus
}
```

### New PanelOptions (Simpler)
```typescript
interface PanelOptions {
  width?: number | `${number}%`;
  minWidth?: number;  // No maxHeight
  anchor?: PanelAnchor;
  offsetX?: number;
  offsetY?: number;
  row?: number | `${number}%`;
  col?: number | `${number}%`;
  visible?: (cols: number, rows: number) => boolean;  // Signature different
  nonCapturing?: boolean;  // Same
  // No margin property
}
```

**Missing:** `maxHeight`, `margin` (as object or uniform number), more flexible anchor handling.

---

## Rendering Architecture Gap

### Legacy Differential Rendering (Optimized)
1. **Viewport tracking** — remembers scroll position, preserves on resize
2. **Line diffing** — finds first/last changed lines, updates only that range
3. **Append optimization** — special case for adding lines only (spinners, progress)
4. **Delete optimization** — clears only lines that disappeared
5. **Image line detection** — `isImageLine()` protects terminal image escape sequences
6. **Segment resets** — adds `\x1b[0m\x1b]8;;\x07` after EVERY line to prevent ANSI state bleed
7. **Synchronized output** — wraps render in `\x1b[?2026h` / `\x1b[?2026l` for atomic screen updates
8. **Debug logging** — `PI_DEBUG_REDRAW` env var logs render decisions to file
9. **Termux-aware** — detects terminal height changes from soft keyboard

### New Rendering (Naive)
1. Full redraw always (no diff)
2. No viewport tracking → scrollback lost on resize
3. No append/delete optimizations
4. No image line protection
5. No per-line segment resets → ANSI colors may bleed
6. No synchronized output → possible flicker during render
7. No debug insights
8. Handles Termux via `clearOnShrink` but not intelligently

**Impact:** New rendering may cause flicker on slow terminals, loses scroll position on resize, risks ANSI state bleed. However, it's simpler and works for typical coding agent use (small, static UI).

---

## Keyboard Input Architecture

### Legacy: Input Listener Chain
```typescript
tui.addInputListener((data) => {
  // Can modify data: return { consume: false, data: modified }
  // Can consume: return { consume: true }
  // Or return undefined to pass through
});
```
Multiple listeners can be registered; they run in order. Each can transform or consume input.

### New: Key Handler Set
```typescript
ui.addKeyHandler((key) => {
  // Returns void or undefined
  // Cannot modify key before others see it
  // No ordering guarantee (Set iteration order)
});
```
Simpler but less powerful. No chaining/modification capability.

**Missing:** Chainable input preprocessing, modify-before-delivery pattern.

---

## Terminal Image Support (Major Gap)

### Legacy terminal-image.ts (381 lines)
- **Protocol detection**: Kitty, iTerm2, Ghostty, WezTerm, VSCode, Alacritty
- **Image rendering**: `renderImage()` with sixel/kitty/iter2/iTerm formats
- **Dimension parsing**: PNG, JPEG, GIF, WebP headers
- **Cell dimension query**: `CSI 16 t` to get character cell size (needed for image layout)
- **Image lifecycle**: `allocateImageId()`, `deleteKittyImage()`, `deleteAllKittyImages()`
- **Fallback strategies**: Graceful degradation when images unsupported

### New terminal.ts
- Only basic `ProcessTerminal` I/O
- No image support at all

**Missing:** All image rendering capabilities. If coding agent needs to show images (screenshots, diagrams), this is a major gap.

---

## Utilities Comparison

### Both Have:
- `visibleWidth()` — legacy uses `get-east-asian-width` for accuracy
- `wrapText()` / `truncateText()` — similar
- `extractAnsiCode()`, `extractSegments()`, `sliceByColumn()`, `sliceWithWidth()`
- `stripAnsi()`, `hasAnsi()`, `getSegmenter()`

### New Has Extra:
- `splitGraphemes()`, `graphemeLength()`, `padText()`, `escapeRegex()`

### Legacy Has Extra:
- Tab expansion (`\t` → spaces) in Text component
- `truncateToWidth()` that respects ANSI codes and multi-byte chars

**Conclusion:** Utilities are comparable; new arguably more comprehensive.

---

## Missing High-Level Components

These components exist in legacy but **not in new implementation**. Coding agent doesn't use them currently, but they are valuable for a complete TUI library:

1. **CancellableLoader** — Loader + AbortSignal
2. **ProgressBar** / **Stepper** — Progress tracking
3. **Toast** / **Modal** — Notifications and dialogs
4. **Badge** / **Rating** — Status indicators
5. **CommandPalette** — CMD+Shift+P style discovery
6. **ContextMenu** — Right-click menus
7. **FileBrowser** — File/dir selection with navigation
8. **Breadcrumbs** — Navigation trail
9. **Diff** — Side-by-side or unified diff viewer
10. **ModelSelector** — LLM model picker (specific to AI coding agents)

---

## Autocomplete System (Major Missing Feature)

Legacy `autocomplete.ts` (773 lines):
- **AutocompleteProvider interface** — pluggable completion sources
- **CombinedAutocompleteProvider** — merges slash commands + file paths
- **Slash command completion** — `/` triggers command suggestions
- **File path completion** — respects `.gitignore`, uses `fd` for speed
- **Prefix handling** — `@` for mentions, `"` for quoted paths
- **AbortSignal** — cancellable async lookup
- **Fuzzy matching** — scored results with highlighting

New TUI has **no autocomplete** infrastructure.

**Impact:** Coding agent would need to implement completions from scratch if wanted.

---

## Editor Component Gap

Legacy `editor.ts` — Full text editor:
- Multi-line editing with cursor navigation
- Undo/redo via `UndoStack` (generic)
- Kill ring (Emacs-style yank/paste)
- Line wrapping, indentation preservation
- Search/replace
- Syntax highlighting (basic)
- Vim/Emacs keybindings (optional)

New TUI has **no editor component**. Coding agent uses `Text` (single-line) or custom `InputBox` (not in TUI package).

**Impact:** If coding agent wants a built-in editor, must be added.

---

## What Coding Agent Actually Uses

From `coding-agent/src/tui-app.ts`:
```typescript
import {
  TerminalUI,  // ✅ Has
  ProcessTerminal, // ✅ Has
  Text,  // ✅ Has
  SelectList,  // ✅ Has
  SettingsList,  // ✅ Has
  BorderedLoader,  // ✅ Has
  Markdown,  // ✅ Has
  CURSOR_MARKER,  // ✅ Has
} from '@picro/tui';

import type {
  UIElement,  // ✅ Has
  InteractiveElement,  // ✅ Has
  KeyEvent,  // ✅ Has
  RenderContext,  // ✅ Has
  SelectItem,  // ✅ Has (from select-list)
  SettingItem,  // ✅ Has (from settings-list)
} from '@picro/tui';
```

**All 14 exports are present and functional in new implementation.** ✅

---

## Feature Parity Gap Summary

### Critical Gaps (if aiming for full legacy replacement):
1. ✗ Input listener chain
2. ✗ Terminal image support (protocols + rendering)
3. ✗ Autocomplete system (file paths, slash commands)
4. ✗ Cell dimension querying (`CSI 16 t`)
5. ✗ Viewport-aware differential rendering
6. ✗ Append/delete optimizations
7. ✗ Per-line segment resets (ANSI bleed prevention)
8. ✗ Synchronized output (`\x1b[?2026`)
9. ✗ Overlay maxHeight (scrollable panels)
10. ✗ Overlay margin property
11. ✗ Debug redraw logging

### Missing Components (not needed by agent but good to have):
12. Editor (with kill ring, undo stack)
13. CancellableLoader
14. ProgressBar, Stepper, Toast, Modal, Badge, Rating
15. CommandPalette, ContextMenu, FileBrowser, Breadcrumbs, Diff
16. ModelSelector, ThemeSelector, SessionSelector (application-specific)

### New Advantages:
+ Mouse hit testing with geometry
+ Structured `KeyEvent` with modifiers
+ TypeScript strictness throughout
+ Markdown with syntax highlighting (highlight.js integration)

---

## Recommendations

**For Coding Agent Use Case:**
- ✅ New implementation is **sufficient** — has all 14 required exports
- ✅ Simpler, cleaner API
- ✅ Better TypeScript types
- ⚠️ Consider adding `maxHeight` to PanelOptions if scrollable panels needed
- ⚠️ Consider restoring input listener chain if agent needs input preprocessing

**For Full Legacy Replacement:**
Would require ~3,000-5,000 LOC to add:
- Terminal image protocols
- Differential rendering with viewport
- Autocomplete infrastructure
- Editor component
- Additional UI components (toast, modal, etc.)
- Input listener chain
- Segment reset after lines
- Synchronized output

---

## Conclusion

The new TUI is **not a full legacy replacement** — it's a **minimal, focused subset** that serves the coding agent's current needs perfectly. To become a general-purpose TUI framework like legacy, significant features would need to be added.

**No code was copied** from legacy — new implementation rewrote everything with different APIs and architecture while achieving compatibility for the coding agent's requirements.

**Verdict:** ✅ New implementation is complete for its intended purpose. Legacy contains many features that are not required.
