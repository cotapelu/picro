# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Compaction system with auto-compaction and manual compaction.
- Extensions system with loader, runner, and flag support.
- Auth guidance messages for missing API keys or model selection.
- Performance tracker for CPU/memory over time.
- Prioritized event emitter with buffering and metrics.
- Event recorder for debugging and replay.
- Event type guards for all AgentEvent types.
- File mutation queue for sequential file operations.
- Advanced truncation strategies (bytes, lines, visual, middle, preserve ends).
- Congestion control for steering and follow-up queues.
- Session search & filtering (findByLabel, findByTypes, searchMessages).
- Settings manager file locking with stale lock cleanup.
- Settings validation schemas.
- Settings change listeners.
- Output guard enhancements: binary detection, sanitization.
- Diagnostics: network interfaces, performance metrics.
- Resource loader caching for skills, prompts, agents files.
- Package manager: install, uninstall, update, conflict detection, health checks.
- Many new utilities and improvements.

### Changed
- Updated default configs and integrated new systems.

### Fixed
- Various bug fixes and stability improvements.

## [0.0.1] - 2025-05-01

Initial release of @picro/agent.
