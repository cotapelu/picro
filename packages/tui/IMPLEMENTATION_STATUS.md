# TUI Implementation Status: New vs Legacy

## Quick Answer

**New TUI status:**
- ✅ Has all 14 exports needed by coding agent
- ✅ Builds and tests pass (143 tests)
- ❌ Missing ~20+ features from legacy
- ❌ Not a drop-in replacement for legacy TUI

---

## What's Missing (by Priority)

### 🔴 Critical (Breaks Compatibility if Used)
1. **Overlay margin support** — `OverlayOptions.margin` missing from PanelOptions
2. **Overlay maxHeight** — Scrollable panels impossible without this
3. **Input listener chain** — `addInputListener()`/`removeInputListener()` for preprocessing
4. **Terminal image protocols** — Kitty/iTerm image rendering (381 lines)
5. **Cell dimension querying** — `CSI 16 t` for image cell size
6. **Viewport-aware rendering** — Preserves scroll position on resize
7. **Differential rendering** — Only updates changed lines (performance)

### 🟡 Important (Improves Quality)
8. **Append-only optimization** — For spinners, progress indicators
9. **Delete-only optimization** — Efficient content shrinking
10. **Segment reset after lines** — Prevents ANSI color bleed
11. **Synchronized output** — `\x1b[?2026` atomic updates
12. **Debug redraw logging** — `PI_DEBUG_REDRAW` file diagnostics
13. **Termux keyboard height handling** — Smart resize behavior
14. **Image line detection** — Protect image escape sequences from truncation

### 🟢 Nice-to-Have (Components)
15. **CancellableLoader** — Loader with AbortSignal
16. **ProgressBar / Stepper** — Progress UI
17. **Toast / Modal** — Notifications & dialogs
18. **Badge / Rating** — Status indicators
19. **CommandPalette** — CMD+Shift+P command discovery
20. **ContextMenu** — Right-click menus
21. **FileBrowser** — File/directory browser
22. **Breadcrumbs** — Navigation path
23. **Diff viewer** — Code diff display
24. **Editor component** — Full multi-line editor (KillRing + UndoStack)
25. **Autocomplete system** — File paths + slash commands (773 lines)

---

## Files to Create/Modify

### To Add Missing Core Features:

**1. Add margin to PanelOptions** (`src/components/base.ts`)
```typescript
interface PanelMargin {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

interface PanelOptions {
  // ... existing
  margin?: PanelMargin | number;  // ADD THIS
  maxHeight?: number | `${number}%`;  // ADD THIS
}
```

**2. Implement input listener chain** (`src/components/tui.ts`)
```typescript
type InputListener = (data: string) => { consume?: boolean; data?: string } | undefined;
private inputListeners = new Set<InputListener>();

addInputListener(listener: InputListener): () => void {}
removeInputListener(listener: InputListener): void {}
// Modify handleKey to run listener chain before parsing
```

**3. Add segment reset support** (`src/components/tui.ts`)
```typescript
private applySegmentResets(lines: string[]): string[] {
  // Add \x1b[0m\x1b]8;;\x07 after each line
  return lines.map(line => line + '\x1b[0m\x1b]8;;\x07');
}
```

**4. Add synchronized output wrappers** (`src/components/tui.ts`)
```typescript
private synchronizedRender(lines: string[]): void {
  this.terminal.write('\x1b[?2026h');  // Start synchronized
  // ... render lines
  this.terminal.write('\x1b[?2026l');  // End synchronized
}
```

**5. Add debug logging** (`src/components/tui.ts`)
```typescript
private logRenderDecision(msg: string): void {
  if (process.env.PI_DEBUG_REDRAW) {
    fs.appendFileSync(process.env.PI_DEBUG_REDRAW, `${Date.now()}: ${msg}\n`);
  }
}
```

**6. Add append-only optimization detection** — Compare previousLines length vs newLines length

**7. Add delete-only optimization detection** — Compare lengths opposite direction

**8. Add viewport tracking** — Track `previousViewportTop`, calculate scroll delta

**9. Add cell dimension querying** (`src/components/terminal.ts`)
```typescript
queryCellSize(): Promise<{width: number; height: number}> {
  // Send CSI 16 t, parse response
}
```

**10. Add terminal image support** — Create `terminal-image.ts` (381 lines from legacy)

**11. Add autocomplete system** — Create `autocomplete.ts` (773 lines from legacy)

**12. Add CancellableLoader** (`src/components/loader.ts` extension)

---

## Files Already Implemented (✅)

### Core
- Base.ts: All types (UIElement, InteractiveElement, KeyEvent, RenderContext, etc.)
- Tui.ts: TerminalUI class
- Terminal.ts: ProcessTerminal
- Stdin-buffer.ts: Input buffering
- Keys.ts: Key parsing
- Internal-utils.ts: Text utilities

### Components
- Text, Markdown (with syntax highlighting)
- SelectList, SettingsList
- BorderedLoader
- Box, Spacer, Divider, DynamicBorder (basic)
- TruncatedText

### Utilities
- Fuzzy matching (exposed)
- Keybindings manager

---

## Test Coverage

**Existing tests:** 143 tests pass
- ✅ Public API test (13 assertions)
- ✅ TerminalUI tests
- ✅ Components tests
- ✅ Utils tests
- ❌ No tests for missing features

---

## Recommended Action Plan

### Phase 1 — Ensure Coding Agent Works (DONE)
- [x] Minimal 14-export public API
- [x] All components functional
- [x] Build passes, tests pass

### Phase 2 — Close Critical Gaps (Optional)
- [ ] Add `margin` to PanelOptions
- [ ] Add `maxHeight` to PanelOptions
- [ ] Implement input listener chain
- [ ] Add segment resets to rendering
- [ ] Add synchronized output
- [ ] Add debug logging

### Phase 3 — Advanced Features (If Needed)
- [ ] Terminal image support
- [ ] Differential rendering
- [ ] Viewport management
- [ ] Autocomplete system
- [ ] Editor component (kill ring + undo stack)
- [ ] Additional UI components (toast, modal, progress, etc.)

---

## Conclusion

**Current new TUI is intentionally minimal.**

It implements exactly what the coding agent needs and nothing more. Legacy contains many features that are:
- Application-specific (interactive/components/)
- Editor-specific (kill-ring, undo-stack)
- Nice-to-have but not essential (progress bars, diff viewer)

**If you want full legacy parity**, expect to add ~3,000-5,000 lines of code across ~15 new files.

**If you only need coding agent**, the current implementation is **complete and correct**.
