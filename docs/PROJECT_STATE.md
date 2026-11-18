# PROJECT_STATE.md

## High-Level Overview

**Project:** `picro` – AI coding agent CLI  
**Tech Stack:** TypeScript, Node.js, Ink TUI (raw-mode TTY only)  
**Architecture:** Session-based agent runtime với LLM providers, tools, và interactive TUI.

## Current State (as of 2025-07-05, post audit round 15)

### Components

- `src/agent/` – Core agent loop, tool executor, context manager
- `src/session/` – Session storage, model registry, auth
- `src/runtime/` – AgentSessionRuntime, settings, resource loader, diagnostics
- `src/tools/` – Built-in tools (read, write, edit, bash, grep, find, ls)
- `src/tui/ink/` – Ink TUI: `core/` (terminal layer), `components/`, `theme/`
- `src/modes/interactive/` – interactive-mode + interactive-controller (logic ⇄ UI seam)

### CLI Modes

Only TTY mode supported (no print/json/rpc).  
Entry: `src/main.ts` → creates runtime → Ink TUI (`interactive-app.tsx`),
readline fallback khi stdin không phải TTY.

### Slash Commands (Ink TUI)

- Đầy đủ: `/model` `/settings` `/theme` `/thinking` `/tree` `/fork` `/trust`
  `/login` `/logout` `/name` `/session` `/hotkeys` `/changelog` `/debug`
  `/export` `/import` `/compact` `/reload` `/help` `/quit`
- Bash mode: `!cmd` / `!!cmd`; hàng đợi steer/follow-up (phím newline)
- Transcript render đủ loại item, cuộn theo dòng hiển thị, page keys
- Overlay thật (model/session/settings/theme/thinking/tree/fork/trust/help)

### Known Issues / Tech Debt

1. ✅ `src/tty-mode` đã thay bằng Ink TUI (`src/tui/ink`) + `src/modes/interactive`
2. ✅ Interactive mode + controller đã nâng cấp đầy đủ (transcript, overlay, queue, slash)
3. ✅ Coverage: 2870 test pass, ~210 file test
### Metrics (post-evolution round 15)

- Build: ✅ Pass (`npm run build` = tsc + copy-assets)
- Tests: ✅ 3087 pass / 2 skip (222 file)
- Typecheck: ✅ `npx tsc --noEmit` clean
- Complexity: core modules được tách; component render mỗi cái <20 dòng JSX body

---

## Next Steps (Prioritized)

1. ✅ Keyboard Protocol hoàn thiện (Kitty CSI-u flags 1,2,4 + modifyOtherKeys + legacy)
2. ✅ Terminal Class (`ProcessTerminal`) với Kitty protocol negotiation
3. ✅ Stdin Buffer cho escape sequence reassembly
4. ✅ Layout Engine (Component, Container, VStack, HStack, ScrollView)
5. ✅ Base TUI Classes (TUI, TuiMainScreen, TuiAltScreen)
6. ✅ Editor component rewrite (visual line map, sticky column, history, kill ring, undo, external editor, clipboard paste)
7. ✅ SelectList enhancement (keyboard nav, mouse, focusable, pagination)
8. ✅ SettingsList component (SettingItem, submenu, search, SteppedSubmenu, SelectSubmenu)
9. ✅ Theme System (tokens, theme class, system theme, loading, controller, TUI helpers)

---

## Next Steps (Phase 4+)

1. ⏳ Chat Viewport (`ScrollView` transcript với `follow: "end"`)
2. ⏳ Header component (BuiltInHeader, logo, key hints)
3. ⏳ Footer component (token stats, git branch, model info)
4. ⏳ Model Selector, Session Selector, Settings Selector, Theme Selector
5. ⏳ Tree Selector, Login/Logout, Thinking Selector
6. ⏳ Tree Selector, Login/Logout, Thinking Selector

---

*Last updated: 2025-07-05 – Theme System hoàn thiện (tokens, theme class, system theme, loading, controller, TUI helpers); 3087 test pass.