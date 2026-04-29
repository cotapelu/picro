# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-01-20

### Added
- **Full streaming implementation** in `AgentRunner.stream()` with delta events
- **Discriminated union types** for agent events (`events.ts`) for better type safety
- **ThinkingContent block support** in message serialization (includes `thinkingSignature`)
- **Extension loader improvements**: TypeScript (`.ts`) support and `package.json` `pi.extensions` manifest discovery
- **Session manager fix**: Proper CompactionEntry handling in `buildSessionContext()`
- **Message conversion** utility (`convert-to-llm.ts`) for session-specific message types
- **Integration tests**:
  - Cross-package import validation
  - TUI + Agent coexistence
  - Streaming with mock and real LLM providers
- **Comprehensive analysis report** (`ANALYSIS_REPORT.md`) comparing with reference implementation

### Changed
- Agent core architecture: Separated `Agent` (facade) + `AgentRunner` (loop) + `ToolExecutor` + `ContextBuilder`
- EventEmitter now uses typed events from `events.ts` (backward compatible)
- ContextBuilder properly serializes ThinkingBlocks with `[Thinking: ...]` format

### Fixed
- Compaction summary message emission and message filtering bug in session manager
- `shouldContinue` logic in streaming to use extracted tool calls

### Technical
- Total tests: **140** (Agent), **117** (TUI), **199** (LLM), **40** (Memory) = **496 total passing**
- All packages build successfully
- Clean-room implementation verified against reference

---

## [0.0.1] - 2025-01-15

### Added
- Initial release of Picro
- Agent framework with tool execution
- TUI library with differential rendering
- LLM integration (2966 models from 98 providers)
- Memory storage and retrieval system
- Session persistence with JSONL format
- Extension system with loader and runtime
- Comprehensive test suites
