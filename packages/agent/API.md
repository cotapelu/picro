# API Reference

This document provides an overview of the public API for `@picro/agent`.

## Core

- `Agent` - Main agent orchestrator.
- `AgentSession` - High-level session management.
- `SessionManager` - Manages conversation persistence.
- `SettingsManager` - Manages global and project settings.

## Tools & Execution

- `ToolExecutor` - Executes tool calls.
- `ToolDefinition` - Interface for tool definitions.
- Built-in tools: `createBashToolDefinition`, `createReadToolDefinition`, `createWriteToolDefinition`, `createEditToolDefinition`, `createLsToolDefinition`.

## Context & Loop

- `ContextBuilder` - Builds context for LLM.
- Loop strategies: `ReActLoopStrategy`, `PlanSolveLoopStrategy`, `ReflectionLoopStrategy`, `SimpleLoopStrategy`, `SelfRefineLoopStrategy`.
- `LoopStrategyFactory`.

## Events

- `EventEmitter` - Core event emitter.
- `PrioritizedEventEmitter` - Event emitter with priority queues.
- `EventRecorder` - Record and replay events.
- Event type guards in `event-guards.ts`.

## Utilities

- `PerformanceTracker` - Track CPU/memory over time.
- `FileMutationQueue` - Queue for file mutations.
- Truncation utilities: `truncateBytes`, `truncateLines`, `truncateVisualLines`, `truncateMiddle`, `truncatePreserveEnds`.
- `validateSettings`, `validateOrThrow` - Settings validation.
- Auth guidance: `formatNoApiKeyFoundMessage`, `formatNoModelSelectedMessage`, etc.
- `expandPromptTemplate` - Prompt template expansion.

## Resources

- `DefaultResourceLoader` - Loads skills, prompts, agents files.
- `DefaultModelRegistry` - Model lookup and auth.

## Package Manager

- `DefaultPackageManager` - Install, uninstall, update packages.

## Types

See `types.ts` for full type definitions.
