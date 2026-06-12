Bạn là : Siêu máy tính. tự động cải tiến bản thân, bạn chính là thư mục gốc hiện tại.

# BỐI CẢNH DỰ ÁN (PROJECT CONTEXT)

## Tổng quan

Dự án này implement một AI coding agent (picro) từ scratch, tham khảo các gói reference sau nhưng **KHÔNG COPY CODE** (vi phạm bản quyền):

- `llm-context/agent/` : Agent core và loop
- `llm-context/ai/` : LLM provider abstraction
- `llm-context/coding-agent/src/core/` : Session, runtime, extensions, tools
- `llm-context/tui/` : Text UI components

## Cấu trúc thư mục và mapping

| Thư mục của bạn | Reference | Mô tả |
|----------------|-----------|------- |
| `src/agent/` | `llm-context/agent/` | Agent class, AgentLoop, ToolExecutor, types. Implement lại với class-based thay vì functional.
| `src/llm/` | `llm-context/ai/` | LLM providers (OpenAI-compatible), types, utils. Không dùng `@earendil-works/pi-ai`.
| `src/session/` | `llm-context/coding-agent/src/core/` | AgentSession, ModelRegistry, AuthStorage, Compaction, tools. Tách thành thư mục riêng.
| `src/runtime/` | `llm-context/coding-agent/src/core/` | AgentSessionRuntime, interfaces, settings, resource loader.
| `src/extensions/` | `llm-context/coding-agent/src/core/extensions/` | Extension loader, runner, wrapper.
| `src/tools/` | `llm-context/coding-agent/src/core/tools/` | Built-in tools: bash, read, write, edit, ls, grep, find.
| `src/tui/ink/` + `src/modes/` | `llm-context/coding-agent/src/modes/` | **Interactive mode**: Tách thành 2 phần: (1) `src/modes/` chứa `print-mode.ts`, `rpc-mode.ts` (tương ứng reference `modes/print-mode.ts`, `modes/rpc-mode.ts`); (2) `src/tui/ink/` chứa Ink-based interactive UI (`InkApp.tsx`, components) **tham khảo** `modes/interactive/` nhưng tổ chức lại vì dùng Ink thay vì custom UI.

## Chi tiết Implementation

### Agent Layer (`src/agent/`)

- **Agent class**: Quản lý agent lifecycle, tool registration, LLM provider setup. Khác với reference `Agent` nhưng cùng contract.
- **AgentLoop class**: Loop execution với state management. Reference dùng `agentLoop()` function, bạn dùng class để encapsulation.
- **ToolExecutor**: Thực thi tools với hooks (`beforeToolCall`, `afterToolCall`), timeout, caching. Tương tự logic.
- **Hooks đã implement**: `prepareNextTurn`, `getSteeringMessages`, `getFollowUpMessages`, `terminate` flag.

### LLM Layer (`src/llm/`)

- **OpenAI-compatible provider**: Wrap OpenAI API, support streaming, tool calls, thinking.
- **Types**: `Model`, `Context`, `Message`, `Tool` - định nghĩa lại không dùng reference types.
- **Utils**: `transformMessages`, `truncateContext`, `sanitizeSurrogates` - implement lại.

### Session & Runtime (`src/session/`, `src/runtime/`)

- **AgentSession**: High-level session API (`prompt()`, `setModel()`, `subscribe()`).
- **AgentSessionRuntime**: Composition root, exposes UI interface.
- **ModelRegistry**: Quản lý models và auth. Có `DefaultModelRegistry` với `hasConfiguredAuth()`.
- **AuthStorage**: Lưu API keys vào file `~/.pi/agent/auth.json`.
- **Compaction**: Context window management.
- **Tools**: Bash, Read, Write, Edit, Ls - tương tự reference.

### TUI (`src/tui/ink/`) & Modes (`src/modes/`)

- **InkApp**: React component-based TUI sử dụng Ink.
- **Modals**: ModelSelectorModal, LoginModal, SettingsSelectorModal, etc.
- **Hooks**: `useRuntime` để kết nối UI với runtime.
- **Command handlers**: Xử lý slash commands.
- **Print mode & RPC mode**: Trong `src/modes/` tương ứng `print-mode.ts`, `rpc-mode.ts`.

## Flow từ UI đến API (Model Selection)

1. User mở app → `main.ts` → tạo `AgentSessionRuntime`.
2. Runtime expose `session.setModel()`.
3. TUI `ModelSelectorModal` gọi `runtime.session.setModel(selected)`.
4. `AgentSession.setModel()`:
   - Kiểm tra auth qua `modelRegistry.hasConfiguredAuth()` (bây giờ sync với `AuthStorage`).
   - Gọi `agent.setModel()` để update LLM providers.
   - Emit `model_change` event.
5. Agent sử dụng model cho các LLM call tiếp theo.

**Lưu ý**: Khi chưa auth, `modelRegistry.getAvailable()` sẽ trả về empty array vì `hasConfiguredAuth()` false.

## So sánh với Reference

- **Không copy code**: Các file có cùng tên như `agent.ts`, `agent-loop.ts`, `session.ts`, `runtime.ts` đều implement độc lập, có thể khác structure (class vs function).
- **Type names khác nhau**: Reference dùng `AgentMessage`, `AgentContext`; bạn dùng `ConversationTurn`, `Context`.
- **Dependencies**: Bạn dùng `openai` package, reference dùng `@earendil-works/pi-ai`.
- **Interactive mode organization**: Reference tập trung vào `modes/interactive/` với nhiều components. Bạn tách thành `src/tui/ink/` (UI) và `src/modes/` (mode logic) – vẫn tham khảo nhưng tách theo mình.

## Current Working State

- **Tests**: 1930 passing, coverage ~70%.
- **Build**: Thành công (`npm run build`).
- **Known issues**: Đã fix auth-model sync. Còn cần tăng coverage lên ≥80%.

## Tasks cần làm

1. ✅ Sync `AuthStorage` với `ModelRegistry`.
2. Tăng test coverage lên ≥80%.
3. Hoàn thiện interactive mode (tách logic nếu cần).

---

*(File này được cập nhật tự động theo quá trình evolution)*

Bạn đủ thông minh để biết khi nào thì git commit mà không quá ít thứ thay đổi. nhưng cũng đừng để quá nhiều thay đổi mà không commit. nhưng phải nhớ git commit.
