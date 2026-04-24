# Coding Agent

AI-powered coding assistant with memory and multi-provider support.

> **Note:** This is the **application layer** package that brings together all core packages:
> - `@picro/agent` - Core agent logic (ReAct, tool execution, strategies)
> - `@picro/llm` - LLM provider abstraction (800+ models)
> - `@picro/memory` - Memory storage and retrieval
> - `@picro/tui` - Terminal UI components
>
> For the core agent library, see [`packages/agent`](../agent/).

## Features

### Core
- **Interactive TUI**: Modern terminal UI with chat
- **Memory**: Remembers files, edits, commands; shows retrieval count
- **Tool Execution**: File ops, search, git, command execution
- **Multi-Provider**: OpenAI, Anthropic, Google, NVIDIA, 25+ providers
- **Session Management**: Save, load, rename, tag, list, delete conversations
- **BM25 Search**: Relevance-ranked message search with filters (by tag, date)
- **Error Recovery**: Auto-retry on network failures (exponential backoff)
- **Config Validation**: Auto-fixes invalid config on load
- **Performance**: Memory retrieval <50ms p95 with candidate prefiltering; cache with TTL

### Security
- **Input Sanitization**: CommandTools allows/block lists; argument validation
- **Path Traversal Protection**: File and Search tools restricted to project directory (canonical path checks)

### TUI UX
- **Markdown Rendering**: Syntax-highlighted code blocks with copy button
- **Command Palette**: `Ctrl+P` with type-ahead filtering
- **Settings Panel**: Change provider/model, maxRounds
- **Real-time Progress**: Elapsed time during tool execution
- **Error Recovery**: Press `R` to retry failed requests
- **History Navigation**: `↑`/`↓` when input empty
- **Multiline Input**: `Ctrl+Enter` for newlines
- **F1 Help**: Full keybindings reference
- **Debug Mode**: `F5` toggle metrics overlay; logs to `~/.picro/agent/debug.log`
- **Quick Copy**: Press `c` to copy last code block
- **Memory Panel**: `Ctrl+M` shows retrieved memories with edit/delete
- **Themes**: Dark and light themes (toggle via palette or command)
- **Loading Spinners**: Visual feedback during async operations

## Installation

```bash
cd packages/coding-agent
npm install
npm run build
```

## Usage

```bash
# Interactive TUI (default)
node dist/src/main.js interactive
# or
node dist/src/main.js i

# Single prompt
node dist/src/main.js run "Explain this codebase"

# Config
node dist/src/main.js config list
node dist/src/main.js config set nvidia-nim mistralai/mistral-small-4-119b-2603
```

## TUI Keybindings

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Ctrl+Enter` | Insert newline |
| `↑` (empty) | Command history |
| `↑` (messages) | Scroll up |
| `↓` (empty) | Command history |
| `↓` (messages) | Scroll down |
| `Ctrl+P` | Command palette |
| `F1` | Help overlay |
| `F5` | Toggle debug panel |
| `Ctrl+M` | Show memories |
| `c` | Copy last code block |
| `Ctrl+A/E` | Line start/end |
| `Ctrl+K` | Delete to end |
| `Backspace` | Delete char |
| `←→` | Cursor navigation |
| `Home/End` | Jump to ends |
| `Ctrl+C` | Exit / Cancel |
| `R` (on error) | Retry last request |

## Command Palette (`Ctrl+P`)

- **Provider & Model** - Change LLM provider and model
- **App Settings** - Set maxRounds (1,2,5,10,20,50)
- **Search Messages** - Full-text search in chat history (BM25 ranked)
- **Save Session** - Save current conversation
- **Load Session** - Restore a saved conversation
- **Delete Session** - Remove a saved session (with confirmation)
- **List Sessions** - Show all saved sessions (filter by tag)
- **Copy Last Code** - Copy last code block to clipboard
- **Find Command** - Search commands by keyword
- **Clear Memory** - Remove all memories
- **Memory Stats** - Show memory statistics
- **Toggle Theme** - Switch between dark and light theme
- **Exit** - Quit the application

## Error Handling

- **Network errors**: Auto-detected, `R` to retry with exponential backoff
- **Tool failures**: Shown with ❌ icon, `R` to retry
- **User-friendly messages**: Common errors (file not found, permission) are explained
- **Status bar**: Shows current operation (Thinking, Running, Error, Cancelled)

## Architecture

- `src/main.ts` - CLI entry point
- `src/tui-app.ts` - Full TUI implementation (ChatUI, MessageList, panels)
- `src/llm-adapter.ts` - LLM provider abstraction
- `src/tools/` - Tool implementations
  - `file-tools.ts` - File read/write/list
  - `code-tools.ts` - Code analysis, search
  - `command-tools.ts` - Shell command execution
  - `search-tools.ts` - Content/file search
  - `git-tools.ts` - Git operations
- `src/core/manager.ts` - Session manager
- `src/config/` - Configuration management (with validation)
- `src/debug.ts` - Debug mode metrics collector
- `src/input-box.ts` - Reusable text input component
- `src/search/bm25.ts` - BM25 ranking algorithm for message search

## TUI Components (`@picro/tui`)

- `TerminalUI` - Main UI orchestrator
- `UIElement` / `InteractiveElement` - Base interfaces
- `Text` - Styled text rendering
- `Box` - Container with padding/bg
- `Markdown` - Markdown with code blocks
- `SelectList` - Interactive selection list
- `SettingsList` - Toggle settings list
- `BorderedLoader` - Spinner with cancel
- `DynamicBorder` - Decorative borders

## Examples

See `examples/`:

- `tui-chat.ts` - Minimal custom TUI setup

## License

MIT
