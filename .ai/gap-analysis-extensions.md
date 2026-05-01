# Gap Analysis: Extensions System

## Reference (llm-context/agent/core/extensions/)
- `types.ts`: Đầy đủ types:
  - `Extension`, `ExtensionFactory`, `ExtensionHandler`
  - `ExtensionContext`, `ExtensionUIContext`, `ExtensionCommandContext`
  - `ExtensionEvent`: BeforeAgentStartEvent, TurnStartEvent, TurnEndEvent, MessageStartEvent, MessageUpdateEvent, MessageEndEvent, ToolCallStartEvent, ToolCallEndEvent, ToolExecutionUpdateEvent, SessionStartEvent, SessionShutdownEvent, SessionBeforeCompactEvent, SessionBeforeSwitchEvent, SessionBeforeForkEvent, SessionBeforeTreeEvent, SessionCompactEvent, SessionTreeEvent
  - `RegisteredTool`, `ToolInfo`, `ToolDefinition`, `ToolExecutionMode`
  - `WorkingIndicatorOptions`, `ToolRenderResultOptions`
  - `AutocompleteProviderFactory`, `MessageRenderer`
  - `WidgetPlacement`, `ExtensionWidgetOptions`, `ExtensionSelectorOptions`
  - `Shortcut`, `AppKeybinding`
  - `ExtensionFlag`, `FlagDefinition`

- `loader.ts`: `discoverAndLoadExtensions()`, load từ packages dir, extension paths
- `runner.ts`: `ExtensionRunner` class:
  - `runExtension(extension)`
  - `emit<T>(event): Promise<T | undefined>` - emit với handler results
  - `hasHandlers(eventType): boolean`
  - `provideAutocomplete(context): Promise<AutocompleteProviderFactory[]>`
  - `renderMessage(message, options): Promise<MessageRenderResult | null>`
  - `renderToolExecution(toolCall, result, options): Promise<ToolRenderResult | null>`
  - `createWidget(widgetOptions): Promise<ExtensionComponent | null>`
  - `selectString(options): Promise<string | undefined>`
  - Flag management: `flagValues.set(name, value)`

- `wrapper.ts`: `wrapRegisteredTools(tools, runner): RegisteredTool[]` - wrap AgentTool thành Extension-compatible
- `index.ts`: Barrel export tất cả

## Current Implementation (src/extensions/)
- `types.ts`: PARTIAL only:
  - Có `Extension`, `ExtensionHandler`, `ExtensionContext`
  - Thiếu: `ExtensionUIContext`, `ExtensionCommandContext`, `ToolInfo`, `WorkingIndicatorOptions`, `ToolRenderResultOptions`, `AutocompleteProviderFactory`, `MessageRenderer`, `WidgetPlacement`, `ExtensionWidgetOptions`, `ExtensionSelectorOptions`, `Shortcut`, `AppKeybinding`, `ExtensionFlag`, `FlagDefinition`
  - Thiếu hầu hết event types (chỉ có basic AgentEvent mapping)

- `loader.ts`: Có `loadExtensions()` nhưng chưa rõ hoàn chỉnh
- `runner.ts`: Có `ExtensionRunner` nhưng thiếu nhiều methods:
  - ❌ `emit<T>(event)` với result handling
  - ❌ `provideAutocomplete()`
  - ❌ `renderMessage()`
  - ❌ `renderToolExecution()`
  - ❌ `createWidget()`
  - ❌ `selectString()`
  - ❌ Flag management đầy đủ
- `wrapper.ts`: ❌ CHƯA CÓ (cần tạo)
- `index.ts`: Barrel export chưa đầy đủ

## GAPS
1. ❌ Thiếu đa số Extension types (UIContext, CommandContext, ToolInfo, Widget-related types)
2. ❌ Thiếu几乎 all extension events (BeforeAgentStart, SessionBefore*, ToolCall*, MessageUpdate, etc.)
3. ❌ ExtensionRunner.emit() chưa có generic return type, chưa collect handler results
4. ❌ ExtensionRunner thiếu UI methods: provideAutocomplete, renderMessage, renderToolExecution, createWidget, selectString
5. ❌ ExtensionRunner thiếu flag value management (get/set)
6. ❌ ExtensionRunner thiếu `hasHandlers()` check
7. ❌ `wrapper.ts` chưa tồn tại: cần `wrapRegisteredTools()` để convert AgentTool → RegisteredTool
8. ❌ `loader.ts` chưa có `discoverAndLoadExtensions()` - discovery logic từ packages dir
9. ❌ Extension flag definitions (type FlagDefinition) chưa có
10. ❌ Extension autocomplete provider system chưa có
11. ❌ Extension widget system chưa có
12. ❌ Integration với AgentSession: ExtensionRunner instance chưa được tạo/quản lý
13. ❌ Extension contexts (UIContext, CommandContext) chưa được truyền vào handlers

## Implementation Plan
- Phase 1: Bổ sung thiếu types trong types.ts ( ExtensionUIContext, ExtensionCommandContext, ToolInfo, events, widget types)
- Phase 2: Implement wrapper.ts với wrapRegisteredTools()
- Phase 3: Enhance ExtensionRunner:
  - emit<T>() với result aggregation
  - hasHandlers()
  - flag value storage (Map)
- Phase 4: Add UI methods vào ExtensionRunner (stubs for now, đợi TUI integration)
- Phase 5: Implement discoverAndLoadExtensions() trong loader.ts
- Phase 6: Integrate ExtensionRunner vào AgentSession construction
- Phase 7: Add extension event emission points trong Agent và AgentSession
- Phase 8: Add flag definitions và validation
