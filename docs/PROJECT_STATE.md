# PROJECT_STATE.md

## High-Level Overview

**Project:** `picro` – AI coding agent CLI  
**Tech Stack:** TypeScript, Node.js, Ink TUI (raw-mode TTY only)  
**Architecture:** Session-based agent runtime với LLM providers, tools, và interactive TUI.

## Current State (as of 2025-07-05, post audit round 8)

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
### Metrics (post-evolution round 8)

- Build: ✅ Pass (`npm run build` = tsc + copy-assets)
- Tests: ✅ 2941 pass / 2 skip (218 file)
- Typecheck: ✅ `npx tsc --noEmit` clean
- Complexity: core modules được tách; component render mỗi cái <20 dòng JSX body

---

## Next Steps (Prioritized)

1. ✅ Ink TUI + interactive mode hoàn chỉnh
2. ✅ Hoàn thiện footer (cache R/W, CH%, cost, git branch, routed model) qua FooterDataProvider
3. ✅ Compaction gọi LLM thật (thay stub) + branch summarization gọi LLM thật
4. Gắn phím tắt còn thiếu (Ctrl+G editor, Ctrl+V clipboard, Ctrl+P/N cycling)

---

*Last updated: 2025-11-13 – compaction & branch summarization gọi LLM thật thay stub; footer nối FooterDataProvider; 2941 test pass.
