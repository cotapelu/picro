# Rewrite TUI with Ink (React-based)

## Goal
Replace the custom TUI (`src/tui/*`) with Ink (`ink` + React) to have a fully functional, well-structured interactive UI.

## Status: In Progress

## Components to Implement

### Core
- [x] `InkApp` - main app component with render loop
- [ ] `Header` - title and status bar
- [ ] `MessageList` - scrollable list of messages (user/assistant/tool)
- [ ] `MessageItem` - individual message component with styling
- [ ] `InputBox` - multiline input with cursor, history, kill ring
- [ ] `Footer` - status line, hints

### Features
- [ ] **Message rendering**: User, Assistant (streaming), Tool (execution)
- [ ] **Input handling**: printable chars, Enter (submit), Ctrl+Enter (newline), Ctrl+C (exit), arrow keys (nav), history (up/down), kill ring (Ctrl+K, Ctrl+Y, etc.)
- [ ] **Command Palette**: `Ctrl+P` to open, list commands with descriptions
- [ ] **Slash commands**: `/quit`, `/new`, `/thinking`, `/login`, `/help`, `/resume`, `/copy`
- [ ] **Thinking level selector**: modal to choose thinking level
- [ ] **Tool execution display**: collapsible tool calls with output
- [ ] **Autocomplete**: Tab to trigger, modal with suggestions
- [ ] **Login dialog**: modal to enter API key
- [ ] **External editor**: spawn $EDITOR with current input
- [ ] **Copy to clipboard**: copy chat history
- [ ] **Notifications**: temporary status messages
- [ ] **Theme support**: dark/light colors
- [ ] **Settings**: persist preferences (thinking level, theme, etc.)
- [ ] **Session management**: new, switch, fork (dialogs)

### Advanced (optional)
- [ ] **File browser**: modal to browse and select files
- [ ] **Memory panel**: show and insert memories
- [ ] **Debug panel**: show timing metrics
- [ ] **Search**: incremental search through messages
- [ ] **Keybindings customization**

## Migration Steps

1. **Keep runtime unchanged** - `AgentSessionRuntime` stays as is.
2. **Create Ink components** in `src/tui/ink/`:
   - `InkApp.tsx` - main component, subscribes to runtime events
   - `components/` - Message, Input, etc.
   - `hooks/` - custom hooks (useInput, useRuntime, etc.)
   - `modals/` - command palette, dialogs
3. **Remove old TUI**: Once Ink UI is complete, delete `src/tui/tui.ts`, `interactive-mode.ts`, `organisms/`, `molecules/`, `atoms/`, `core/` (except maybe reuse `stdin-buffer` if needed, but Ink handles input differently).
4. **Update main.ts** to use Ink app.
5. **Update tsconfig**: ensure JSX support: `"jsx": "react-jsx"`.
6. **Add dependencies**: `ink`, `react`, `@types/react`.

## Notes
- Ink provides its own `useInput`, `useStdin`, `useStdout`. We'll rely on those.
- No need for raw mode or custom terminal handling; Ink manages that.
- Stream rendering: Ink auto-updates on state changes.
- For streaming assistant messages, we'll append text as it arrives.

## Current blockers
- None, start implementing.

## Order of implementation
1. Basic layout (header, message list, input, footer)
2. Message rendering (user/assistant/tool) with streaming
3. Input handling (basic typing, submit)
4. Command palette and slash commands
5. Tool execution UI (expand/collapse)
6. Dialogs (thinking, login, external editor)
7. Polish (themes, keybindings, settings)
