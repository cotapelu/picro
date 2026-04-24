# Changelog

All notable changes to **pi-micro** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- **Tool Timeout Countdown** – Displays remaining time during tool execution

### Added
- **Debug Mode** (F5) – Show metrics overlay; logs to `~/.picro/agent/debug.log`
- **Tool Progress** – Elapsed time displayed during tool execution
- **BM25 Ranking** – Relevance-ranked search in chat history (Ctrl+P → Search Messages)
- **Session Management** – Rename and tag sessions via Manage Session command
- **Config Validation** – Automatic correction of invalid config on load
- **Memory Indicator** – `[📚 N memories]` shown when memories used
- **Retry Logic** – Exponential backoff retry (3 attempts) for LLM network errors
- **Session Filtering** – List sessions filtered by tag
- **Quick Copy** – Press `c` to copy last code block (no focus required)
- **Memory Cache TTL** – Configurable cache TTL via `setCacheTTL`
- **User-Friendly Errors** – Actionable messages for file/network errors
- **Components** – `InputBox` component for text entry
- **BM25 Module** – `src/search/bm25.ts` for reusable ranking
- **Tests** – Unit tests for DebugCollector, InputBox, BM25, ConfigValidation, ChatUI search, memory UI, syntax highlighting, tool progress
- **Security Hardening** – Input sanitization in CommandTools (blocked/allowed lists), path traversal protection in FileTools and SearchTools
- **Performance Profiling** – Memory retrieval latency tracking (p95), configurable `maxCandidates` to bound latency (<50ms target)
- **Context Truncation** – `maxContextCharsPerMemory` to reduce token usage
- **Theme Support** – Light/dark theme toggle (`toggle-theme` command)
- **Command Palette Filter** – `Ctrl+P` opens command finder with type-ahead filtering
- **Loading Spinners** – Visual feedback during async operations
- **Syntax Highlighting** – Code block borders, language labels, copy button
- **Search Recent Messages** – Date filter for chat history search (last 7 days)
- **Memory Citation** – Assistant responses indicate number of retrieved memories used

- **Bulk Session Rename** – Select multiple sessions and rename with a common prefix (Ctrl+Shift+R)
- **BM25 Filters** – Role and date range (since/until) filtering in message search (e.g., `role:assistant since:2025-01-01 until:2025-01-31`).

### Changed
- **README** – Updated with new keybindings, palette commands, features
- **Architecture Docs** – Created `docs/architecture.md` with system design
- **Tool Reference** – Created `docs/tools.md` documenting all built-in tools

### Fixed
- Memory retrieval test adapter integration
- Various config validation edge cases (types, ranges)

## [0.0.1] - 2026-04-23

Initial public release of pi-micro as a monorepo.

### Core Packages
- `@picro/agent` – Core agent orchestration (ReAct, strategies, tools)
- `@picro/llm` – 25+ providers, 1100+ models
- `@picro/memory` – Storage, retrieval, scoring, cache
- `@picro/tui` – Terminal UI components
- `@picro/coding-agent` – The `picro` CLI application

### Features
- Interactive TUI with chat, markdown, code highlighting
- Memory: remembers files, edits, commands (with auto-forgetting)
- Tools: file operations, code search, git, command execution
- Multi-provider support, session save/load
- Command palette (Ctrl+P), settings, help overlay

---

**Note:** This project is in active pre-v1.0 development. Breaking changes may occur.
